exports.calculateDistance = (descriptor1, descriptor2) => {

  let sum = 0;

  for (let i = 0; i < descriptor1.length; i++) {

    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);

  }

  return Math.sqrt(sum);

};

exports.isMatch = (descriptor1, descriptor2, threshold = 0.55) => {

  const distance = exports.calculateDistance(descriptor1, descriptor2);

  return distance < threshold;

};