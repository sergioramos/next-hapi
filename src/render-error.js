const XssFilters = require('xss-filters');

const errorToJSON = err => {
  const { name, message, stack } = err;
  const json = { name, message, stack };

  if (err.module) {
    // rawRequest contains the filename of the module which has the error.
    const { rawRequest } = err.module;
    json.module = { rawRequest };
  }

  return json;
};

const serializeError = (dev, err) => {
  if (dev) {
    return errorToJSON(err);
  }

  return {
    message: '500 - Internal Server Error.'
  };
};

const enoentErrorSrc = page => `
  window.__NEXT_REGISTER_PAGE('${page}', function() {
    var error = new Error('Page does not exist: ${page}')
    error.statusCode = 404
    return { error: error }
  })
`;

const canonicalErrorSrc = ({ page, dev, error }) => `
  window.__NEXT_REGISTER_PAGE('${page}', function() {
    var error = ${JSON.stringify(error)}
    return { error: error }
  })
`;

const errorSrc = ({ page, dev, error, customFields }) =>
  error.code === 'ENOENT'
    ? enoentErrorSrc(page)
    : canonicalErrorSrc({
        page,
        dev,
        error: { ...serializeError(dev, error), ...customFields }
      });

module.exports = function(page, error, customFields, { dev }) {
  const res = this;

  // prevent XSS attacks by filtering the page before printing it.
  const _page = XssFilters.uriInSingleQuotedAttr('/_error');

  return (
    res
      .response(errorSrc({ page: _page, dev, error, customFields }))
      // Asks CDNs and others to not to cache the errored page
      .header('Cache-Control', 'no-store, must-revalidate')
      .header('Content-Type', 'text/javascript')
  );
};
