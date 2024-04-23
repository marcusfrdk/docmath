let fractions;
let equations;

function parseEquations(){
  if(typeof equations === "string") equations = [equations];

  // create a new set
  let _variables = new Set();
  let _answers = new Set();

  equations.forEach((equation, index) => {
    const ans_regex = /=\s*\{\{([^{}]+)\}\}$/g;
    const ans_match = ans_regex.exec(equation);
    
    if(ans_match) _answers.add(ans_match[1]);

    const var_matches = equation.match(/{{(.*?)}}/g).map((match) => match.replace(/{{|}}/g, ""));
    
    var_matches.forEach((var_match) => {
      if(!_answers.has(var_match)) {
        _variables.add(var_match);
      };
    });
  });

  return [[..._variables], [..._answers]];
}

function init(config){
  // Equations
  if(typeof equations === "undefined"){
    throw new Error("No equations are defined.")
  }
  
  const [variableDefinitions, answerDefinitions] = parseEquations(equations);

  // console.log("Variables:", variableDefinitions);
  // console.log("Answers:", answerDefinitions);
  
  // Check if any values are both defined and computed
  const common = variableDefinitions.filter(value => answerDefinitions.includes(value));
  if(common.length > 0){
    throw new Error(`Variable${common.length === 1 ? "" : "s"} ${common.join(", ")} ${common.length === 1 ? "is" : "are"} both defined and computed.`);
  }

  // Undefined variables
  variableDefinitions.forEach(key => {
    if(!config.hasOwnProperty(key)){
      throw new Error(`Undefined variable '${key}' in config.`);
    }
  });

  // Answer defined in config
  answerDefinitions.forEach(key => {
    if(config.hasOwnProperty(key)){
      throw new Error(`Cannot define variable '${key}' in config since it is a computed value.`);
    }
  });

  // Fractions
  if(typeof fractions !== "undefined"){
    if(typeof fractions !== "number"){
      throw new Error("Fractions must be a number.");
    }

    if(fractions < 0){
      throw new Error("Fractions must be a positive integer.");
    }
  }

  // Types
  const validTypes = {
    "min": ["number", "string", "undefined"],
    "max": ["number", "string", "undefined"],
    "default": ["number", "undefined"],
    "step": ["number", "undefined"],
  };

  Object.entries(config).forEach(([key, value]) => {
    if(typeof value !== "object"){
      throw new Error(`Invalid type for '${key}'.`);
    }

    Object.entries(value).forEach(([attribute, val]) => {
      if(!validTypes.hasOwnProperty(attribute)){
        throw new Error(`Invalid attribute '${attribute}' for '${key}'.`);
      }

      if(!validTypes[attribute].includes(typeof val)){
        const expectedTypes = validTypes[attribute].join(", ");
        throw new Error(`Invalid type for '${key}.${attribute}', got '${typeof val}', expected one of ${expectedTypes}.`);
      }
    });
  });

  // References
  const configKeys = Object.keys(config);
  const attributes = ["min", "max"];
  const references = configKeys.reduce((acc, key) => {
    acc[key] = {};
    return acc;
  }, {});

  Object.entries(config).forEach(([key, value]) => {
    attributes.forEach(attribute => {
      if(typeof value[attribute] === "string"){
        // Undefined reference
        if(!configKeys.includes(value[attribute])){
          if(answerDefinitions.includes(value[attribute])){
            throw new Error(`Only static values can be referenced at the moment, found computed value '${value[attribute]}' for '${key}.${attribute}'.`)
          } else {
            throw new Error(`Undefined reference '${value[attribute]}' for '${key}.${attribute}'.`);
          }
        }

        // Self reference
        if(value[attribute] === key){
          throw new Error(`Self reference found for '${key}.${attribute}'.`);
        }

        // Add reference
        if(Array.isArray(references[key][value[attribute]])){
          references[key][value[attribute]].push(attribute);
        } else {
          references[key][value[attribute]] = [attribute];
        }
      }
    });
  });

  // Circular references
  Object.entries(config).forEach(([key, value]) => {
    Object.entries(value).forEach(([_, val]) => {
      if(typeof val === "string"){
        if(references[val] && references[val].hasOwnProperty(key)){
          throw new Error(`Circular reference between '${key}' and '${val}'.`);
        }
      }
    });
  });

  console.log("References:", references);
}