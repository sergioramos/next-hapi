const { default: GetConfig } = require('next/dist/server/config');
const { default: ResolvePath } = require('next/dist/server/resolve');
const Intercept = require('apr-intercept');
const Path = require('path');

module.exports = async function(page, opts) {
  const res = this;

  const dist = GetConfig(opts.dir).distDir;
  const path = Path.join(opts.dir, dist, 'bundles', 'pages', page);

  const [err, realPath] = await Intercept(ResolvePath(path));

  if (err && err.code === 'ENOENT') {
    return res.hapi_next_renderError(page, err, {}, opts);
  }

  if (err) {
    throw err;
  }

  return res.file(realPath, { confine: false });
};
