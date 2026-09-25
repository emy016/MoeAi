/** The current student's memories, skills and instructions, readable without React (the API client sends it for guests). */
let current = { memories: [], skills: [], instructions: '' };
export const setPersonalSnapshot = (value) => { current = value; };
export const personalForRequest = () => ({
  memories: current.memories.slice(0, 60).map(({ key, value, importance }) => ({ key, value, importance })),
  skills: current.skills.filter((s) => s.enabled !== false).slice(0, 5).map(({ name, content }) => ({ name, content })),
  instructions: current.instructions || '',
});
