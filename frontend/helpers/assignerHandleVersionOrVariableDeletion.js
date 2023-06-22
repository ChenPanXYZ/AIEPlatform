// To Policy Author, please note that you need to remove the version and variable from the assigner's policy, if your policy makes use of the version or variable that you are deleting.

import TSConfigurable from "../components/ManageDeploymentPage/MOOCletEditor/TSConfigurable";


function assignerHandleVersionOrVariableDeletion(policy, parameters, factors, variables, versions) {
    if(policy === "UniformRandom") {
        return parameters;
    }
    else if (policy === "WeightedRandom") {
        for (const key in parameters) {
            if (!factors.some(obj => obj === key)) {
              delete parameters[key];
            }
          }
        return parameters;
    }
    else if (policy === "ThompsonSamplingContextual") {
        // Step 1: remove the item from the formula items (two for loop, one for version one for variable).
        // Step 2: remove the formula item that are empty. Reduce the corresponding parameters.

        // Can do: prompt the user it's very risky to do when an experiment is running. They may want to keep a copy of the previous matrices

        if(parameters['regressionFormulaItems'] === undefined) {
            return parameters;
        }
        let allVariables = factors.concat(variables);
    
        for(let i = 0; i < parameters['regressionFormulaItems'].length; i++) {
            parameters['regressionFormulaItems'][i] = parameters['regressionFormulaItems'][i].filter(item => {
                return allVariables.some(obj => obj === item);
              });

            
        }
        
        let deepCopy = JSON.parse(JSON.stringify(parameters));
        for(let i = 0; i < deepCopy['regressionFormulaItems'].length; i++) {
            if(deepCopy.regressionFormulaItems[i].length === 0) {
                parameters['regressionFormulaItems'].splice(i, 1);

                let coefIndex = deepCopy['include_intercept'] ? i + 1 : i;
                parameters['coef_cov'].splice(coefIndex, 1);
                parameters['coef_cov'].forEach(row => row.splice(coefIndex, 1));

                parameters['coef_mean'].splice(coefIndex, 1);
            }
        }

            
        return parameters;
    }


    else if (policy === "TSConfigurable") {
        if(!parameters['current_posteriors']) {
            parameters['current_posteriors'] = {};
        }
        
        for(let version of versions) {
            console.log(version['name'])
            if(!parameters['current_posteriors'][version['name']]) {
                parameters['current_posteriors'][version['name']] = {"successes": 0, "failures": 0}
            }
        }

        for (const key in parameters['current_posteriors']) {
            if (!versions.some(obj => obj['name'] === key)) {
              delete parameters['current_posteriors'][key];
            }
          }

        console.log(parameters)
        return parameters;
    }
}

export default assignerHandleVersionOrVariableDeletion;