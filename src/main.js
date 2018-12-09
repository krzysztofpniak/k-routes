import React, {Component, Children, cloneElement} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {actionType, forwardTo, nest, createReducer} from 'k-reducer';
import {withLogic, ScopedComponent} from 'k-logic';
import {pure, lifecycle} from 'recompose';
import {
  rootComponentMatcher,
  getCurrentPath,
  buildUrl,
  buildMatcher,
  flattenRoutes,
  toComponentMap,
  renderView,
  getIndexedRoutes,
} from './helpers';
import Path from 'path-parser';
import {
  call,
  compose,
  map,
  mapObjIndexed,
  identity,
  find,
  head,
  filter,
  propEq,
  view,
  set,
  pick,
  prop,
  merge,
  whereEq,
  assocPath,
  equals,
  endsWith,
  has,
  lensPath,
  useWith,
  over,
  lensProp,
} from 'ramda';
import {setState} from './actions';
import {
  NAVIGATED_FROM,
  NAVIGATED_TO,
  ROUTE_PARAMS_UPDATED,
  SET_STATE,
} from './actionTypes';

let callback = () => {};
let flatRoutes = [];
let rootModel = {};
let routerPropName = 'router';
let globalDispatch = null;

const componentMapSelector = createSelector(identity, toComponentMap);

const indexedRoutesSelector = createSelector(identity, getIndexedRoutes);

const initialRoutesSelector = createSelector(
  identity,
  filter(r => !r.hasUrlParams && r.canNavigate)
);

const firstRouteSelector = createSelector(initialRoutesSelector, head);

const routesSelector = createSelector(
  identity,
  map(r => ({
    name: r.name,
    path: r.path,
    paramsMap: r.paramsMap,
    paramLenses: r.paramLenses,
    modelPath: r.modelPath,
  }))
);

const canNavigateTo = routeName => {
  const r = indexedRoutesSelector(flatRoutes)[routeName];

  return r.canNavigate;
};

const buildNavigator = matcher => path => {
  const resolvedPath = typeof path === 'string' ? path : resolveHref(path);
  let route = matcher(resolvedPath);
  if (route) {
    history.pushState(route, null, resolvedPath); // eslint-disable-line
    window.scrollTo(0, 0);
    globalDispatch(setState(route));
  } else {
    console.error(`no matching route ${resolvedPath}`);
  }
};

let pushState = () => {};
let matcher = () => console.error('router not started');

const toPlainRoute = pick(['name', 'params', 'paramsMap', 'path', 'modelPath']);

const startRouting = (routes, override, onOverridden) => {
  matcher = buildMatcher(routes, override, onOverridden);
  pushState = buildNavigator(matcher);
  let route = matcher(getCurrentPath());

  if (route) {
    history.replaceState(toPlainRoute(route), null, buildUrl(route)); // eslint-disable-line
  } else {
    console.error('No route candidates for initial route');
  }

  return {
    pushState,
  };
};

const start = () => {
  globalDispatch(setState(history.state, true));

  const handlePopState = event => {
    globalDispatch(setState(event.state));
  };

  window.addEventListener('popstate', handlePopState);
};

const endsWithSetState = endsWith(`.${SET_STATE}`);

const handleUrlParamsUpdate = (
  nextRouter,
  nextParams,
  nextRoute,
  prevParams,
  prevRoute,
  dispatch
) => {
  const newPath = new Path(nextRouter.path).build(nextParams);
  const route = matcher(newPath);
  if (route) {
    history.replaceState(toPlainRoute(route), '', newPath); // eslint-disable-line
  }

  if (prevRoute && nextRoute.name === prevRoute.name) {
    const payload = {
      prevParams,
      params: nextParams,
    };
    dispatch({
      type: `${prevRoute.modelPath}.${ROUTE_PARAMS_UPDATED}`,
      payload,
    });
  }
};

const createRouterMiddleware = routerProp => ({getState, dispatch}) => {
  globalDispatch = forwardTo(dispatch, routerProp);

  return next => action => {
    const routes = getRoutes();

    const prevState = getState();
    const prevRoute = find(propEq('name', prevState[routerProp].name), routes);
    const returnValue = next(action);
    const nextState = getState();
    const nextRoute = find(propEq('name', nextState[routerProp].name), routes);

    if (nextRoute) {
      const nextParams = mapObjIndexed(
        (v, k) => view(nextRoute.paramLenses[k], view(lensPath(v), nextState)),
        nextState[routerProp].paramsMap
      );

      if (endsWithSetState(action.type) && !prevRoute && nextRoute) {
        dispatch({
          type: `${nextRoute.modelPath}.${NAVIGATED_TO}`,
          payload: {params: nextParams},
        });
      }

      if (prevRoute) {
        const prevParams = mapObjIndexed(
          (v, k) =>
            view(prevRoute.paramLenses[k], view(lensPath(v), prevState)),
          prevState[routerProp].paramsMap
        );

        if (nextRoute.name !== prevRoute.name) {
          dispatch({
            type: `${prevRoute.modelPath}.${NAVIGATED_FROM}`,
          });
          dispatch({
            type: `${nextRoute.modelPath}.${NAVIGATED_TO}`,
            payload: {params: nextParams},
          });
        }

        if (!equals(prevParams, nextParams)) {
          handleUrlParamsUpdate(
            nextState[routerProp],
            nextParams,
            nextRoute,
            prevParams,
            prevRoute,
            dispatch
          );
        }
      } else if (endsWithSetState(action.type) && action.payload.initial) {
        handleUrlParamsUpdate(
          nextState[routerProp],
          nextParams,
          nextRoute,
          {},
          prevRoute,
          dispatch
        );
      }
    }

    return returnValue;
  };
};

const Route = lifecycle({
  componentWillReceiveProps(nextProps) {
    if (nextProps.canNavigate !== this.props.canNavigate) {
      const route = indexedRoutesSelector(flatRoutes)[nextProps.name];
      flatRoutes = assocPath(
        [route.idx, 'canNavigate'],
        nextProps.canNavigate,
        flatRoutes
      );
      flatRoutes = assocPath(
        [route.idx, 'components', nextProps.level, 'isAccessible'],
        nextProps.canNavigate,
        flatRoutes
      );
    }
  },
})(({children, name, level}) => (
  <div>
    {Children.map(children, child =>
      cloneElement(child, {
        //name: `${name}.${child.props.name}`,
        name: name + '.' + child.props.name,
        level: level + 1,
      })
    )}
  </div>
));

const routerUpdater = createReducer({name: '', params: {}}, [
  actionType('SetState', ({name, params, paramsMap, path, modelPath}, model) =>
    merge(model, {name, params, paramsMap, path, modelPath})
  ),
]);

const createRouterReducer = routerProp => {
  const routerReducer = nest(routerProp, routerUpdater);
  const setStateActionType = `${routerProp}.SetState`;

  return (model, action) => {
    routerPropName = routerProp;

    let newModel = routerReducer(model, action);

    if (action.type === setStateActionType) {
      for (let propName in action.payload.paramsMap) {
        if (action.payload.paramsMap.hasOwnProperty(propName)) {
          const paramValue = action.payload.params[propName];
          const modelPath = action.payload.paramsMap[propName];
          const hasParam = has(propName, action.payload.params);

          if (hasParam) {
            const routes = getRoutes();
            const route = find(
              propEq('name', newModel[routerProp].name),
              routes
            );

            newModel = over(
              lensPath(modelPath),
              set(route.paramLenses[propName], paramValue),
              newModel
            );
          }
        }
      }
    }

    return newModel;
  };
};

class RouterInt extends ScopedComponent {
  constructor(props, context) {
    super(props, context);
    this.initRouting = this.initRouting.bind(this);
  }

  static contextTypes = {
    store: PropTypes.object,
    kScope: PropTypes.object,
  };

  static childContextTypes = {
    kScope: PropTypes.object,
  };

  initRouting() {
    flatRoutes = [];
    flattenRoutes(this.props.children, [], flatRoutes);
    const {pushState} = startRouting(
      routesSelector(flatRoutes),
      this.props.override,
      this.props.onOverridden
    );
  }

  componentWillMount() {
    this.initRouting();
    this.assocReducer(
      this.getCurrentScope(),
      createRouterReducer(this.props.scope)
    );
  }

  componentWillUpdate() {
    this.flatRoutes = flatRoutes;
  }

  componentDidUpdate() {
    if (this.flatRoutes !== flatRoutes) {
      this.forceUpdate();
    }
  }

  getCurrentScopePart() {
    return [];
  }

  render() {
    const {
      router: {name, params},
    } = this.getScopedState();

    const components = componentMapSelector(flatRoutes)[name];
    const model = this.context.store.getState();

    return (
      <div>
        {components
          ? renderView(
              components,
              {
                model,
                dispatch: this.dispatch,
                routeParams: params,
              },
              this.props.forbiddenComponent
            )
          : null}
        {Children.map(
          this.props.children,
          child =>
            child
              ? cloneElement(child, {
                  level: 0,
                })
              : null
        )}
      </div>
    );
  }
}

const getRoutes = () => routesSelector(flatRoutes);

const calculateParams = route =>
  mapObjIndexed(
    (v, k) => view(route.paramLenses[k], view(lensPath(v), rootModel)),
    route.paramsMap
  );

const resolveHref = ({href, name, params}) => {
  if (href) {
    return href;
  } else {
    const routes = getRoutes();
    const route = find(propEq('name', name), routes);
    if (!route) {
      throw new Error(`no matching route ${name}`);
    }
    const nextParams = calculateParams(route);
    const newHref = buildUrl({
      path: route.path,
      params: {...nextParams, ...params},
    });
    return newHref;
  }
};

const routeMatches = ({name, params}) =>
  rootModel[routerPropName].name === name &&
  whereEq(params || {}, rootModel[routerPropName].params);

const Link = pure(
  ({href, name, content, title, className, children, params, disabled}) => {
    try {
      const resolvedHref = resolveHref({href, name, params});
      //const isActive = routeMatches({name, params});

      return (
        <a
          //className={`${className || ''}${isActive ? ' active' : ''}`}
          className={className}
          title={title}
          href={resolvedHref}
          disabled={disabled}
          onClick={e => {
            e.preventDefault();
            if (!disabled) {
              pushState(resolvedHref);
            }
          }}
        >
          {React.Children.count(children) !== 0
            ? React.Children.map(children, f => f)
            : content || ''}
        </a>
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }
);

const Router = RouterInt;

const getFirstRoute = () => firstRouteSelector(flatRoutes);
const routerSelector = prop(routerPropName);
const currentRouteNameSelector = createSelector(routerSelector, prop('name'));

const currentRouteSelector = createSelector(
  currentRouteNameSelector,
  getRoutes,
  useWith(find, [
    compose(
      call,
      propEq('name')
    ),
    identity,
  ])
);

const getLastRequestedRoute = () => {
  const route = currentRouteSelector(rootModel);
  const params = calculateParams(route);
  return {
    name: route.name,
    params: params,
  };
};

export {
  buildMatcher,
  buildNavigator,
  startRouting,
  createRouterReducer,
  Route,
  Router,
  Link,
  createRouterMiddleware,
  pushState,
  buildUrl,
  rootComponentMatcher,
  routeMatches,
  canNavigateTo,
  getFirstRoute,
  getRoutes,
  getLastRequestedRoute,
  start,
};
