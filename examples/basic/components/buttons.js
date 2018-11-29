import React from 'react';
import {compose, withHandlers} from 'recompose';
import {withLogic} from 'k-logic';
import {actionType2, createReducer} from 'k-reducer';
import {over, lensProp, add} from 'ramda';

const Scope = withLogic({reducer: () => createReducer({}, [])})(
  ({children}) => <div>{children}</div>
);

const Button = compose(
  withLogic({
    reducer: () =>
      createReducer({counter: 0}, [
        actionType2('INC', over(lensProp('counter'), add(1))),
      ]),
  }),
  withHandlers({
    onClick: props => e => props.dispatch({type: 'INC'}),
  })
)(({children, counter, onClick}) => (
  <button onClick={onClick} type="button">
    {`Hopla ${counter}`}
  </button>
));

const Buttons = () => (
  <Scope scope="buttons">
    <Button scope="b1" />
    <Button scope="b2" />
  </Scope>
);

export default Buttons;
