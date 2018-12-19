import React, {Children, createElement} from 'react';
import Path from 'path-parser';
import {forwardTo} from 'k-reducer';
import {Scope} from 'k-logic';
import {
  map,
  filter,
  forEach,
  mapObjIndexed,
  indexBy,
  compose,
  reduce,
  prop,
  lensProp,
  addIndex,
  assoc,
  defaultTo,
  last,
  always,
  identity,
} from 'ramda';

const defaultToTrue = defaultTo(true);

const mapWithKey = addIndex(map);

const addIndexProps = mapWithKey((i, k) => assoc('idx', k, i));

const getIndexedRoutes = compose(
  indexBy(prop('name')),
  addIndexProps
);

const arrayToObjectOfEmpties = compose(
  map(always('')),
  indexBy(identity)
);

const getParams = path => (path ? new Path(path).params : []);

const flattenRoutes = (children, nodelist, result) => {
  Children.forEach(children, child => {
    if (child) {
      nodelist.push(child);
      flattenRoutes(child.props.children, nodelist, result);
    }
  });

  if (Children.count(children) === 0) {
    const name = map(n => n.props.name, nodelist).join('.');
    const modelPath = map(
      n => n.props.modelPath,
      filter(n => n.props.modelPath, nodelist)
    ).join('.');
    const path = map(n => n.props.path, nodelist).join('');
    const components = map(
      n => ({
        component: n.props.component,
        modelPath: n.props.modelPath,
        canNavigate: n.props.canNavigate,
        canNavigateOut: n.props.canNavigateOut,
        isAccessible: defaultToTrue(n.props.canNavigate),
        propsSelector: n.props.propsSelector,
        propsSelectorArgs: n.props.propsSelectorArgs,
      }),
      nodelist
    );
    const parsedPath = new Path(path);
    const hasQueryParams = parsedPath.hasQueryParams;
    const hasUrlParams = parsedPath.hasUrlParams;
    const params = arrayToObjectOfEmpties(parsedPath.params);
    const paramsMap = reduce(
      (p, c) => {
        let result = {...p.result};
        const newPath = c.props.modelPath
          ? [...p.acc, c.props.modelPath]
          : p.acc;
        getParams(c.props.path).forEach(param => {
          result = {
            ...result,
            [param]: newPath,
          };
        });
        return {result, acc: newPath};
      },
      {acc: [], result: {}},
      nodelist
    ).result;

    const initialParamLenses = mapObjIndexed((v, k) => lensProp(k), paramsMap);
    const paramLenses = reduce(
      (p, c) => ({...p, ...c.props.paramLenses}),
      initialParamLenses,
      nodelist
    );
    const canNavigate = defaultToTrue(last(nodelist).props.canNavigate);
    result.push({
      name,
      path,
      components,
      paramsMap,
      paramLenses,
      modelPath,
      canNavigate,
      hasQueryParams,
      hasUrlParams,
      params,
    });
  }

  nodelist.pop();
};

const resolveAdditionalProps = (selector, model, args) =>
  selector ? selector(model, args) : {};

const PassBy = ({children}) => children;

const renderView = (components, props, forbiddenComponent) => {
  const tail = components.slice();
  const head = tail.shift();

  if (!head) {
    return null;
  }

  const model =
    (head.modelPath ? props.model[head.modelPath] : props.model) || {};
  const dispatch = head.modelPath
    ? forwardTo(props.dispatch, head.modelPath)
    : props.dispatch;

  return defaultToTrue(head.isAccessible)
    ? head.component
      ? createElement(
          head.modelPath ? Scope : PassBy,
          {
            scope: head.modelPath,
          },
          createElement(
            head.component,
            {
              ...props,
              ...resolveAdditionalProps(
                head.propsSelector,
                model,
                head.propsSelectorArgs
              ),
              model,
              dispatch,
            },
            renderView(
              tail,
              {
                ...props,
                model,
                dispatch,
              },
              forbiddenComponent
            )
          )
        )
      : null
    : createElement(forbiddenComponent);
};

const toComponentMap = compose(
  map(prop('components')),
  indexBy(prop('name'))
);

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

const escapeStringRegexp = function(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }

  return str.replace(matchOperatorsRe, '\\$&');
};

const rootComponentMatcher = pattern => {
  const regexp = new RegExp(`${escapeStringRegexp(pattern)}\\.([^.]+)$`);

  return action => {
    const match = action.type.match(regexp);

    if (match) {
      const unwrappedType = match[1];

      return {
        id: `${pattern}`,
        unwrappedType,
        wrap: type => `${pattern}.${type}`,
        args: {},
      };
    } else {
      return false;
    }
  };
};

const getCurrentPath = () => location.pathname + location.search; // eslint-disable-line

const buildRoutes = map(r => ({...r, pathParser: new Path(r.path)}));

const buildUrl = ({path, params}) => {
  try {
    return new Path(path).build(params);
  } catch (e) {
    throw new Error(
      `Missing params for: ${path}, provided params: ${JSON.stringify(params)}`
    );
  }
};

const buildMatcher = (routes, override, onOverridden) => {
  const allRoutes = buildRoutes(routes);

  const internalMatcher = path => {
    let route = null;
    forEach(r => {
      const params = r.pathParser.test(path);
      if (params) {
        route = {
          name: r.name,
          path: r.path,
          paramsMap: r.paramsMap,
          params,
          modelPath: r.modelPath,
        };
        return false;
      }
    }, allRoutes);

    return route;
  };

  return path => {
    let route = internalMatcher(path);

    if (!route) {
      route = {
        ...routes[0],
        params: {},
      };
    }

    if (override) {
      const overriddenRoute = override(route, internalMatcher);
      if (onOverridden && overriddenRoute !== route) {
        onOverridden(route, overriddenRoute);
      }
      route = overriddenRoute || route;
    }

    return route;
  };
};

export {
  flattenRoutes,
  renderView,
  toComponentMap,
  rootComponentMatcher,
  getCurrentPath,
  buildUrl,
  buildMatcher,
  getIndexedRoutes,
};
