let differs = [];

export const addDiffer = diff => differs.push(diff);
export const resetDiffers = () => differs=[];

export const drainDifference = () => {
  const d = differs;
  resetDiffers();

  return d;
};
