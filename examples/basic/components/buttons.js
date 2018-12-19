import React from 'react';
import {withScope, useKReducer, Scope} from 'k-logic';
import {actionType2, createReducer} from 'k-reducer';
import {over, lensProp, add} from 'ramda';

const buttonReducer = createReducer({counter: 0}, [
  actionType2('INC', over(lensProp('counter'), add(1))),
]);

const buttonActions = {
  inc: () => ({type: 'INC'}),
};

const Button = withScope(() => {
  const {inc, counter} = useKReducer(buttonReducer, buttonActions);

  return (
    <button onClick={inc} type="button">
      {`Hopla ${counter}`}
    </button>
  );
});

const Buttons = () => (
  <Scope scope="buttons">
    <Button scope="b1" />
    <Button scope="b2" />
  </Scope>
);

export default Buttons;
