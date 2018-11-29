import {createAction} from 'redux-actions';
import {SET_STATE} from './actionTypes';

const setState = createAction(SET_STATE, (payload, initial) => ({
  ...payload,
  initial,
}));

export {setState};
