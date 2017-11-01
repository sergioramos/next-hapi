const pkg = require('./package.json');

module.exports = function() {
  const { request } = this;
  const { server, raw, url, query } = request;
  const { next } = server.plugins[pkg.name];
  const { req, res } = raw;
  const { path } = url;

  return next.renderToHTML(req, res, path, query);
};
