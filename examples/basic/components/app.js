import React from 'react';
import {addIndex, map} from 'ramda';
import {Link, Route, Router} from '../../../src/main';
import {fork} from 'redux-saga/effects';
import {Scope} from 'k-logic';
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

const Layout = ({children}) => <div>{children}</div>;

const Projects = () => (
  <div>
    <Link
      name="root.projectEdit"
      params={{projectId: 1}}
      content="Go to project"
    />
    <Link name="root.test" content="Go to test" />
    hops
  </div>
);

const ProjectEdit = () => (
  <Scope scope="edit">
    Project Edit
    <Link name="root.projects" content="Go to projects" />
  </Scope>
);

const App0 = () => (
  <Router scope="router">
    <Route name="root" path="/" component={Layout} modelPath2="root">
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
