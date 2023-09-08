import { React, useEffect, useState } from 'react';
import { Typography, TextField, Button, Box, Checkbox, FormControlLabel, Input, Tooltip } from '@mui/material';
import Select from 'react-select';
import CommonAssignerAttribute from '../../CommonAssignerAttributes';

import { calculateFormulateItemSize, coefMeanRemoveItem, coefCovRemoveItem, removeItemsFromSymmetricMatrix } from './TSContextualHelpers';

let theFormula = "";

const CoefCovInput = (props) => {
    let assigner = props.assigner;
    let tree = props.tree;
    let sAssigners = props.sAssigners;

    const handleInputChange = (e, rowIndex, colIndex) => {
        const value = e.target.value;
        assigner['parameters']['coef_cov'][rowIndex][colIndex] = value;
        assigner['parameters']['coef_cov'][colIndex][rowIndex] = value;
        sAssigners(tree);
    };


    const renderMatrix = () => {
        return;

        let items = theFormula.split("~");
        if (items.length > 1) {
            items = items[1];
            items = items.split("+").map(function (item) {
                return item.trim();
            });
        }

        if (assigner['parameters']['include_intercept']) {
            items = ["Intercept"].concat(items);
        }



        return (assigner['parameters']['coef_cov'] || []).map((row, rowIndex) => (
            <Box key={rowIndex} style={{ display: 'flex' }}>
                {row.map((cell, colIndex) => (
                    <Tooltip title={`${items[rowIndex]}, ${items[colIndex]}`}>
                        <Input
                            key={colIndex}
                            value={cell}
                            type={"number"}
                            style={{
                                fontSize: "16px", // Initial font size
                                textRendering: "auto",
                                width: "auto", // Initial width
                                minWidth: "50px", // Set a minimum width
                                maxWidth: "100%", // Ensure input doesn't exceed parent width
                                height: "auto",
                                padding: "5px",
                                border: "1px solid #ccc"
                            }}
                            onChange={e => handleInputChange(e, rowIndex, colIndex)}
                            ref={inputRef => {
                                if (inputRef) {
                                    const parentWidth = inputRef.parentNode.offsetWidth;
                                    const contentWidth = inputRef.scrollWidth;
                                    const fontSize = parseFloat(window.getComputedStyle(inputRef).fontSize);
                                    const maxFontSize = Math.floor(parentWidth / contentWidth * fontSize);
                                    inputRef.style.fontSize = Math.min(fontSize, maxFontSize) + "px";
                                    inputRef.style.width = "auto"; // Reset width after adjusting font size
                                }
                            }}
                        />
                    </Tooltip>
                ))}
            </Box>
        ));
    };

    return (
        <Box>
            {renderMatrix()}
        </Box>
    );
};



const CoefMeanInput = (props) => {
    let assigner = props.assigner;
    let tree = props.tree;
    let sAssigners = props.sAssigners;

    const handleInputChange = (e, index) => {
        const value = e.target.value;
        assigner['parameters']['coef_mean'][index] = value;
        sAssigners(tree);
    };


    const renderMatrix = () => {
        return;
        let items = theFormula.split("~");
        if (items.length > 1) {
            items = items[1];
            items = items.split("+").map(function (item) {
                return item.trim();
            });
        }

        if (assigner['parameters']['include_intercept']) {
            items = ["Intercept"].concat(items);
        }

        return (
            <Box style={{ display: 'flex' }}>
                {(assigner['parameters']['coef_mean'] || []).map((cell, index) => (
                    <Tooltip title={`${items[index]}`}>
                        <Input
                            key={index}
                            value={cell}
                            type={"number"}
                            style={{
                                fontSize: "16px", // Initial font size
                                textRendering: "auto",
                                flex: 1, // Distribute available space evenly
                                minWidth: "50px", // Set a minimum width
                                maxWidth: "100%", // Ensure input doesn't exceed parent width
                                height: "auto",
                                padding: "5px",
                                border: "1px solid #ccc",
                            }}
                            onChange={e => handleInputChange(e, index)}
                            ref={inputRef => {
                                if (inputRef) {
                                    const parentWidth = inputRef.parentNode.offsetWidth;
                                    const contentWidth = inputRef.scrollWidth;
                                    const fontSize = parseFloat(window.getComputedStyle(inputRef).fontSize);
                                    const maxFontSize = Math.floor(parentWidth / contentWidth * fontSize);
                                    inputRef.style.fontSize = Math.min(fontSize, maxFontSize) + "px";
                                    inputRef.style.width = "auto"; // Reset width after adjusting font size
                                }
                            }}
                        />
                    </Tooltip>
                ))
                }
            </Box >
        );
    };

    return (
        <Box>
            {renderMatrix()}
        </Box>
    );
};

export function validate(props) {
    let assigner = props.assigner;
    let parameters = assigner['parameters'];
    let factors = props.factors;
    let variables = props.variables;
    let versions = props.versions;
    let existingVariables = props.existingVariables;

    let original = JSON.parse(JSON.stringify(parameters));
    // Step 1: remove the item from the formula items (two for loop, one for version one for variable).
    // Step 2: remove the formula item that are empty. Reduce the corresponding parameters.

    // Can do: prompt the user it's very risky to do when an experiment is running. They may want to keep a copy of the previous matrices

    if(parameters['regressionFormulaItems'] === undefined) {
        return parameters;
    }
    let allVariables = factors.concat(variables);

    // if variables or versions changes, the regression formula items also need to be changed.
    for(let i = 0; i < parameters['regressionFormulaItems'].length; i++) {
        parameters['regressionFormulaItems'][i] = parameters['regressionFormulaItems'][i].filter(item => {
            return allVariables.some(obj => obj === item);
          });
    }

    // this is a little bit trick. because we may remove multiple items in the same time, we need to do it in a loop.
    let deepCopy = JSON.parse(JSON.stringify(parameters));
    for(let index = 0; index < deepCopy['regressionFormulaItems'].length; index++) {
        if(deepCopy.regressionFormulaItems[index].length === 0) {

            let startPoint = 0;
            for (let i = 0; i < index; i++) {
                startPoint += calculateFormulateItemSize(existingVariables, original['regressionFormulaItems'][i]);
            }
    
            if(original['include_intercept']) {
                startPoint += 1;
            }
            let sizeOfItem = calculateFormulateItemSize(existingVariables, original['regressionFormulaItems'][index]);
            let temp = removeItemsFromSymmetricMatrix(deepCopy['coef_cov'], startPoint, sizeOfItem);


            deepCopy['coef_cov'] = temp;
            deepCopy['coef_mean'].splice(startPoint, sizeOfItem);
            deepCopy['regressionFormulaItems'].splice(index, 1);


            original['regressionFormulaItems'].splice(index, 1); // This step is important. Otherwise, the index will be wrong.
            index--;
        }
    }

    assigner['parameters'] = deepCopy;
}

export const name = "Thompson Sampling Contextuals";

export function main(props) {
    let factors = props.factors;
    let variables = props.variables;
    let assigners = props.assigners;
    let sAssigners = props.sAssigners;
    let myId = props.myId;

    console.log(assigners)
    console.log(myId)

    let tree = [...assigners];
    let assigner = tree.find(assigner => assigner.id === myId);

    console.log(assigner)

    let regressionFormulaVariables = variables.concat(factors);

    let existingVariables = props.existingVariables;


    let [newItem, sNewItem] = useState([]);

    let handleWeightChange = (event, name) => {
        assigner['parameters'][name] = event.target.value;
        sAssigners(tree)

    }
    const coefCovAddNewItem = (startPoint, newItemSize) => {
        if (!assigner['parameters']['coef_cov']) {
          assigner['parameters']['coef_cov'] = [];
        }
      
        const coef_cov = assigner['parameters']['coef_cov'];
        const n = coef_cov.length;
      
        // Expand the existing coef_cov array if necessary
        for (let i = 0; i < n; i++) {
          coef_cov[i].length = n + newItemSize;
        }
        coef_cov.length = n + newItemSize;
      
        // Fill the new elements with 0 and set the diagonal elements to 1
        for (let i = n; i < n + newItemSize; i++) {
          coef_cov[i] = Array(n + newItemSize).fill(0);
          coef_cov[i][i] = 1;
        }
      
        sAssigners(tree);
      };

    const coefMeanAddNewItem = (startPoint, newItemSize) => {
        if (!assigner['parameters']['coef_mean']) {
            assigner['parameters']['coef_mean'] = [];
        }

        // create an array of size newItemSize with value 0
        let newMeans = Array(newItemSize).fill(0);

        // concat at startPoint
        const expandedArray = assigner['parameters']['coef_mean'].slice(0, startPoint).concat(newMeans).concat(assigner['parameters']['coef_mean'].slice(startPoint));

        assigner['parameters']['coef_mean'] = expandedArray;

        sAssigners(tree);
    };

    const addRegressionFormulaItem = () => {
        // newItem is an array like 0: {value: 'job', label: 'job'} 1: {value: 'factor1', label: 'factor1'}.
        // Merge this array with existingVariables based on value, so we know the categorical or not, and the min and max.
        let regressionFormulaItem = newItem.map((item) => item.value);
        let sizeOfNewItems = calculateFormulateItemSize(existingVariables, regressionFormulaItem);

        let temp = [[]]

        if (!assigner['parameters']['regressionFormulaItems']) {
            assigner['parameters']['regressionFormulaItems'] = [];
        }
        if (assigner['parameters']['regressionFormulaItems']) {
            temp = [...assigner['parameters']['regressionFormulaItems'], regressionFormulaItem]
        }
        assigner['parameters']['regressionFormulaItems'] = temp

        sAssigners(tree);

        // get the start point (the current size of coef_mean and coef_cov), and add the size of new items to it.

        coefCovAddNewItem(assigner['parameters']['coef_cov'].length, sizeOfNewItems);
        coefMeanAddNewItem(assigner['parameters']['coef_cov'].length, sizeOfNewItems);
        sNewItem([]);
    }

    const removeFields = (index) => {
        // calculate the start point.

        let startPoint = 0;
        for (let i = 0; i < index; i++) {
            startPoint += calculateFormulateItemSize(existingVariables, assigner['parameters']['regressionFormulaItems'][i]);
        }

        if (assigner['parameters']['include_intercept']) {
            startPoint += 1;
        }



        coefCovRemoveItem(assigner, startPoint, calculateFormulateItemSize(existingVariables, assigner['parameters']['regressionFormulaItems'][index]));
        coefMeanRemoveItem(assigner, startPoint, calculateFormulateItemSize(existingVariables, assigner['parameters']['regressionFormulaItems'][index]));
        assigner['parameters']['regressionFormulaItems'].splice(index, 1);
        sAssigners(tree);

    }

    function generateCombinations(arrays) {
        if (arrays.length === 0) {
            return [[]];
        }

        const firstArray = arrays[0];
        const restArrays = arrays.slice(1);
        const combinationsWithoutFirst = generateCombinations(restArrays);

        const result = [];

        for (const element of firstArray) {
            for (const combination of combinationsWithoutFirst) {
                result.push([element, ...combination]);
            }
        }

        return result;
    }

    const writeRegressionFormula = () => {
        let formula = "reward ~ "
        if (assigner['parameters']['regressionFormulaItems']) {

            let expandedFormulaItems = [];

            for (let i = 0; i < assigner['parameters']['regressionFormulaItems'].length; i++) {
                let item = assigner['parameters']['regressionFormulaItems'][i];
                let merged = item.map((item) => {
                    let found = existingVariables.find((variable) => variable.name === item);
                    return { item, ...found };
                });
                let expandedItem = [];
                merged.forEach((item) => {
                    if (item.type === 'categorical') {
                        let temp = [];
                        for (let i = item.min; i <= item.max; i++) {
                            temp.push(`${item.name}::${i}`);
                        }
                        expandedItem.push(temp);
                    }
                    else {
                        expandedItem.push([item.item]);
                    }
                });
                expandedFormulaItems = expandedFormulaItems.concat(generateCombinations(expandedItem));
            }

            formula += expandedFormulaItems.map((item) => {
                // need to check if any of the item is categorical or not.
                // item is like ['job', 'nonCategorical']. let's say job is categorical.
                // Then we need to expand the item to ['job::1', 'job::2', ..., nonCategorical], depending on the min and max of job.
                return item.join(" * ")
            }).join(" + ")
        }

        theFormula = formula;
        return formula
    }


    useEffect(() => {
        // Initial parameters for TSContextual.
        if (!assigner['parameters']['batch_size']) assigner['parameters']['batch_size'] = 4
        if (!assigner['parameters']['variance_a']) assigner['parameters']['variance_a'] = 2
        if (!assigner['parameters']['variance_b']) assigner['parameters']['variance_b'] = 1
        if (!assigner['parameters']['uniform_threshold']) assigner['parameters']['uniform_threshold'] = 8
        if (!assigner['parameters']['updatedPerMinute']) assigner['parameters']['updatedPerMinute'] = 0
        if (!assigner['parameters']['include_intercept']) assigner['parameters']['include_intercept'] = false
        if (!assigner['parameters']['individualLevelBatchSize']) assigner['parameters']['individualLevelBatchSize'] = 1
        if (!assigner['parameters']['coef_cov']) assigner['parameters']['coef_cov'] = [];
        if (!assigner['parameters']['coef_mean']) assigner['parameters']['coef_mean'] = [];
        sAssigners(tree);

    }, []);

    const applyFullInteraction = () => {

        function getCombinations(arr) {
            let result = [];
          
            function backtrack(currentCombo, remainingElements) {
              if (currentCombo.length === arr.length) {
                result.push([...currentCombo]);
                return;
              }
          
              for (let i = 0; i < remainingElements.length; i++) {
                currentCombo.push(remainingElements[i]);
                backtrack(currentCombo, remainingElements.slice(i + 1));
                currentCombo.pop();
              }
            }
          
            backtrack([], arr);
            return result;
          }
        // So, we need to delete all regression formula items as the first step.
        assigner['parameters']['regressionFormulaItems'] = [];
        // if include intercept, keep the first row and first column, and delete the rest. Otherwise initialize the matrix with size 0.
        if (assigner['parameters']['include_intercept']) {
            assigner['parameters']['coef_cov'] = [[assigner['parameters']['coef_cov'][0][0]]];
            assigner['parameters']['coef_mean'] = [assigner['parameters']['coef_mean'][0]];
        }
        else {
            assigner['parameters']['coef_cov'] = [];
            assigner['parameters']['coef_mean'] = [];
        }

        // Then, we need to:
        // 1. add all variables to regression formula items.
        // 2. add all factors to the regression formula items.
        // 3. add all interactions [between every variable and every factor] to the regression formula items.

        let allVariables = variables;
        let allFactors = factors;

        console.log(allVariables);
        console.log(allFactors);

        // Note that allVariables and allFactors are just strings, not objects. 
        // 1. add all variables to regression formula items.
        allVariables.forEach((variable) => {
            assigner['parameters']['regressionFormulaItems'].push([variable]);
        });

        // 2. add all factors to the regression formula items.
        allFactors.forEach((factor) => {
            assigner['parameters']['regressionFormulaItems'].push([factor]);
        });

        const combinations = getCombinations(allVariables);

        // For each combination, add every factors to it.

        let combinationsPlusFactors = [];
        combinations.forEach((combination) => {
            allFactors.forEach((factor) => {
                combinationsPlusFactors.push(combination.concat(factor));
            });
        });

        combinationsPlusFactors.forEach((combination) => {
            assigner['parameters']['regressionFormulaItems'].push(combination);
        });

        // Now, we need to update the coef_cov and coef_mean.
        let size = 0;
        for(let regressionFormulaItem of assigner['parameters']['regressionFormulaItems']) {
            size += calculateFormulateItemSize(existingVariables, regressionFormulaItem);
        }

        console.log(size)

        if (assigner['parameters']['include_intercept']) {
            size += 1;
        }

        // make a coef_cov size of size * size, and fill the diagonal with 1.
        assigner['parameters']['coef_cov'] = Array(size).fill(0).map(() => Array(size).fill(0));
        for(let i = 0; i < size; i++) {
            assigner['parameters']['coef_cov'][i][i] = 1;
        }

        // make a coef_mean of size size, and fill with 0.
        assigner['parameters']['coef_mean'] = Array(size).fill(0);
        // coefCovAddNewItem(0, size);
        console.log("done")
        // coefMeanAddNewItem(0, size);
        sAssigners(tree);
    }



    return (
        <Box>
            <TextField
                sx={{ m: 1 }}
                required
                label={`Batch size`}
                type="number"
                value={assigner['parameters']['batch_size'] || ''}
                onChange={(e) => handleWeightChange(e, 'batch_size')}
            />
            <TextField
                sx={{ m: 1 }}
                required
                label={`Variance a`}
                type="number"
                value={assigner['parameters']['variance_a'] || ''}
                onChange={(e) => handleWeightChange(e, 'variance_a')}
            />
            <TextField
                sx={{ m: 1 }}
                required
                label={`Variance b`}
                type="number"
                value={assigner['parameters']['variance_b'] || ''}
                onChange={(e) => handleWeightChange(e, 'variance_b')}
            />
            <TextField
                sx={{ m: 1 }}
                required
                label={`Uniform Threshold`}
                type="number"
                value={assigner['parameters']['uniform_threshold'] || ''}
                onChange={(e) => handleWeightChange(e, 'uniform_threshold')}
            />

            <TextField
                sx={{ m: 1 }}
                required
                label={`Posterior Update Frequency (in min)`}
                type="number"
                value={assigner['parameters']['updatedPerMinute'] || ''}
                onChange={(e) => handleWeightChange(e, 'updatedPerMinute')}
            />
            <Box>
                <FormControlLabel
                    control={<Checkbox checked={assigner['parameters']['include_intercept'] || false} onChange={(e) => {
                        assigner['parameters']['include_intercept'] = e.target.checked;
                        sAssigners(tree);
                        if (e.target.checked) {
                            coefCovAddNewItem(0, 1);
                            coefMeanAddNewItem(0, 1);
                        }
                        else {
                            coefCovRemoveItem(assigner, 0, 1);
                            coefMeanRemoveItem(assigner, 0, 1);
                            sAssigners(tree);
                        }
                    }} />}
                    label="Include Intercept"
                />
                <FormControlLabel
                    control={<Checkbox checked={assigner['parameters']['increase_weight_if_last_reward_one'] || false} onChange={(e) => {
                        assigner['parameters']['increase_weight_if_last_reward_one'] = e.target.checked;
                        sAssigners(tree);
                    }} />}
                    label="Increase the weights of the versions whose last complete interaction has reward 1. (only effective if the rewards are binary)."
                />
                <CommonAssignerAttribute
                    assigners={assigners}
                    myId={myId}
                    sAssigners={sAssigners}
                />

                <FormControlLabel
                    control={<Checkbox checked={assigner['parameters']['individualLevel'] || false} onChange={(e) => {
                        if (!assigner['parameters']['individualLevelThreshold']) assigner['parameters']['individualLevelThreshold'] = 0;
                        assigner['parameters']['individualLevel'] = e.target.checked;
                        sAssigners(tree);
                    }} />}
                    label="Enable individual-level regression after receiving a certain number of feedbacks"
                />
                {assigner['parameters']['individualLevel'] && <Box>
                    <p><mark>The individual level regressions will be turned on after receiving the following number of user feedbacks.</mark></p>
                    <TextField
                        sx={{ m: 1 }}
                        value={assigner['parameters']['individualLevelThreshold']}
                        onChange={(e) => {
                            assigner['parameters']['individualLevelThreshold'] = parseFloat(e.target.value);
                            sAssigners(tree);
                        }}
                        label={`Individual-level regression threshold`}
                        type="number"
                    />
                    <TextField
                        sx={{ m: 1 }}
                        value={assigner['parameters']['individualLevelBatchSize']}
                        onChange={(e) => {
                            assigner['parameters']['individualLevelBatchSize'] = parseFloat(e.target.value);
                            sAssigners(tree);
                        }}
                        label={`Individual-level regression batch size`}
                        type="number"
                    />
                </Box>}
            </Box>
            <Box sx={{ m: 1 }}>
                <Typography variant='h6'>Regression Formula Items</Typography> <Button onClick={applyFullInteraction}>Apply a full interaction regression</Button>
                {assigner['parameters']['regressionFormulaItems'] && assigner['parameters']['regressionFormulaItems'].length > 0 && <mark><small>Current regression formula: {writeRegressionFormula()}</small></mark>}
                {assigner['parameters']['regressionFormulaItems'] && assigner['parameters']['regressionFormulaItems'].map((regressionFormulaItem, index) => {
                    return (
                        <Box key={index} margin="10px 0" style={{ position: "relative" }}>
                            <Select
                                isMulti
                                name="contextuals"
                                options={regressionFormulaVariables.map((option) => ({
                                    value: option,
                                    label: option
                                }))}
                                className="basic-multi-select"
                                classNamePrefix="select"
                                value={regressionFormulaItem.map(v => ({ label: v, value: v }))}
                                isDisabled={true}
                                styles={{
                                    // Fixes the overlapping problem of the component
                                    menu: provided => ({ ...provided, zIndex: 9999 })
                                }}
                            />
                            <Button onClick={() => {
                                removeFields(index);
                            }
                            } variant="contained" sx={{ m: 1 }} color="error">Remove</Button>
                        </Box>
                    )
                })}


                <Select
                    isMulti
                    name="contextuals"
                    options={regressionFormulaVariables.map((option) => ({
                        value: option,
                        label: option
                    }))}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    value={newItem}
                    onChange={(e) => {
                        sNewItem(e);
                    }}
                    styles={{
                        // Fixes the overlapping problem of the component
                        menu: provided => ({ ...provided, zIndex: 9999 })
                    }}
                />

                <Button onClick={(e) => {
                    addRegressionFormulaItem();
                }
                } variant="contained" color="primary" sx={{ m: 1 }}>Add a regression formula item</Button>

                <Box>
                    <Typography variant='h6'>Coefficient Covariance</Typography>
                    <small>The first is for the intercept if you have checked to include intercept.</small>
                    <CoefCovInput assigner={assigner} tree={tree} sAssigners={sAssigners} />
                </Box>

                <Box>
                    <Typography variant='h6'>Coefficient mean</Typography>
                    <CoefMeanInput assigner={assigner} tree={tree} sAssigners={sAssigners} />
                </Box>
            </Box>
        </Box >
    )
}