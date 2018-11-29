import {createReducer, nest} from 'k-reducer';

const initialState = {
  router: {},
};

const appReducer = createReducer(initialState, [
  //nest('projects', projectsReducer),
  //nest('projectEdit', projectEditReducer),
]);

export default appReducer;
