import {getProxyKey, proxyfy} from "./proxyEqual";

export const proxyObjectRest = (state, excludingKeys) => {
  const {
    suffix,
    fingerPrint,
    report,
    ProxyMap,
    control
  } = getProxyKey(state);

  const results = [];
  const excludeMap = {};
  excludingKeys.forEach((k) => {
    results.push(state[k])
    excludeMap[k] = true;
  });

  control.seal();
  const rest = {};
  Object.keys(state).forEach((k) => {
    if (!excludeMap[k]) {
      rest[k] = state[k];
    }
  });
  control.unseal();

  return [
    ...results,
    proxyfy(rest, report, suffix, fingerPrint, ProxyMap, control),
  ]
};

export const proxyArrayRest = (state, fromIndex) => {
  const {
    suffix,
    fingerPrint,
    report,
    ProxyMap,
    control
  } = getProxyKey(state);

  const results = [];
  const rest = [];
  let l = state.length;
  let i;
  for (i = 0; i < l && i < fromIndex; ++i) {
    results.push(state[i]);
  }

  control.seal();
  for (; i < l; ++i) {
    rest.push(state[i]);
  }
  control.unseal();

  const prefixedReport = (prefix, key) => {
    if (key === String(+key)) {
      report(prefix, +key + fromIndex)
    } else {
      report(prefix, key);
    }
  };

  return [
    ...results,
    proxyfy(rest, prefixedReport, suffix, fingerPrint, ProxyMap, control),
  ];
};