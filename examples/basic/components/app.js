import React, {createElement} from 'react';
import {
  add,
  addIndex,
  assoc,
  composeP,
  identity,
  lensProp,
  map,
  over,
  pick,
  times,
} from 'ramda';
import {Link, Route, Router} from '../../../src/main';
import {actionType, actionType2, createReducer} from 'k-reducer';
import {compose, withHandlers} from 'recompose';
import {fork} from 'redux-saga/effects';
import {fetchOnEvery, handleAsyncs, withLogic} from 'k-logic';
import Loadable from 'react-loadable';

const mapWithKey = addIndex(map);

const Loading = () => <div>Loading...</div>;

const DynamicTest = Loadable({
  loader: () => import('./buttons'),
  loading: Loading,
});

const getGists = () =>
  fetch('https://api.github.com/gists/public').then(r => r.json(), r => r);

const createSaga = ({start}) =>
  function*() {
    console.log('createSaga');
    yield fork(start);
  };

const InputTest = compose(
  withLogic({
    reducer: () =>
      createReducer({text: 'Jaśko', text2: 'Dupa'}, [
        actionType('SET_TEXT', assoc('text')),
        actionType('SET_TEXT2', assoc('text2')),
      ]),
  }),
  withHandlers({
    onChange: props => e =>
      props.dispatch({type: 'SET_TEXT', payload: e.target.value}),
    onChange2: props => e =>
      props.dispatch({type: 'SET_TEXT2', payload: e.target.value}),
  })
)(({children, text, text2, onChange, onChange2}) => (
  <div>
    <div>Test:</div>
    <div>
      <input value={text} onChange={onChange} />
      XXX:
      <input value={text2} onChange={onChange2} />
    </div>
    {children}
  </div>
));

const Test = compose(
  withLogic({
    reducer: () =>
      createReducer({counter: 0}, [
        actionType2('INC', over(lensProp('counter'), add(1))),
      ]),
  }),
  withHandlers({
    onClick: props => e => props.dispatch({type: 'INC', payload: 'hops'}),
  })
)(({children, counter, onClick}) => (
  <div>
    <div>Test:</div>
    <div>
      <button onClick={onClick} type="button">
        {`Go ${counter}`}
      </button>
      <InputTest scope="input" />
    </div>
    {children}
  </div>
));

const Scope = withLogic({reducer: () => createReducer({}, [])})(
  ({children}) => <div>{children}</div>
);

const Array = withLogic({reducer: () => createReducer({}, [])})(
  ({of, items, ...rest}) =>
    mapWithKey(
      (e, idx) => createElement(of, {...e, ...rest, key: idx, scope: idx}),
      items
    )
);

const Student = compose(
  withLogic({
    reducer: () =>
      createReducer(
        {
          name: '',
          surname: '',
          data: {gists: {result: [], pending: false}},
        },
        [
          actionType('SET_NAME', assoc('name')),
          actionType('SET_SURNAME', assoc('surname')),
          handleAsyncs(),
        ]
      ),
    saga: createSaga({
      start: fetchOnEvery({
        actions: ['SET_NAME'],
        fn: composeP(
          map(pick(['description', 'url'])),
          getGists
        ),
        resourceKey: 'gists',
      }),
    }),
  }),
  withHandlers({
    onNameChange: props => e =>
      props.dispatch({type: 'SET_NAME', payload: e.target.value}),
    onSurnameChange: props => e =>
      props.dispatch({type: 'SET_SURNAME', payload: e.target.value}),
  })
)(({name, onNameChange, surname, onSurnameChange, data}) => (
  <div>
    <input value={name} onChange={onNameChange} />
    <input value={surname} onChange={onSurnameChange} />
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
));

const StudentList = compose(
  withLogic({
    reducer: () =>
      createReducer({itemCount: 0}, [
        actionType2('INC', over(lensProp('itemCount'), add(1))),
      ]),
  }),
  withHandlers({
    onAddStudentClick: props => e => props.dispatch({type: 'INC'}),
  })
)(({children, itemCount, onAddStudentClick}) => (
  <div>
    <Array scope="items" of={Student} items={times(identity, itemCount)} />
    <button onClick={onAddStudentClick} type="button">
      Add
    </button>
  </div>
));

const Layout = ({children}) => <div>{children}</div>;

const Projects = () => (
  <div>
    <Link
      name="root.projectEdit"
      params={{projectId: 1}}
      content="Go to project"
    />
    <Link name="root.test" content="Go to test" />
    <Student scope="s0" />
    <Student scope="s1" />
  </div>
);

const ProjectEdit = () => (
  <Scope scope="edit">
    Project Edit
    <Link name="root.projects" content="Go to projects" />
  </Scope>
);

const App0 = ({model, dispatch}) => (
  <Router scope="router">
    <Route name="root" path="/" component={Layout}>
      <Route
        name="projects"
        path="projects"
        modelPath="projects"
        component={Projects}
      />
      <Route
        name="projectEdit"
        path="projects/:projectId"
        modelPath="projectEdit"
        component={ProjectEdit}
      />
      <Route name="test" path="test" modelPath="test" component={DynamicTest} />
    </Route>
  </Router>
);

const App = Projects;

export default App0;
