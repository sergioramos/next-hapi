const IsChild = require('is-child');
const Intercept = require('apr-intercept');
const ResolvePkg = require('resolve-pkg');
const Path = require('path');

const pkg = require('./package.json');

const NEXT_ROOT = ResolvePkg('next', { cwd: __dirname });
const CLIENT_ROOT = Path.join(NEXT_ROOT, 'dist/client');

module.exports = [
  {
    // This is to support webpack dynamic imports in production
    path: '/_next/{buildId}/webpack/chunks/{name}',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { name, buildId } = params;
      const { dir, dist } = next;

      return next.handleBuildId(buildId, raw.res)
        ? res.file(Path.join(dir, dist, 'chunks', name), { confine: false })
        : res.code(404).close();
    }
  },
  {
    // This is to support webpack dynamic import support with HMR
    path: '/_next/{buildId}/webpack/{id}',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { id, buildId } = params;
      const { dir, dist } = next;

      return next.handleBuildId(buildId, raw.res)
        ? res.file(Path.join(dir, dist, 'chunks', id), { confine: false })
        : res.code(404).close();
    }
  },
  {
    path: '/_next/{hash}/manifest.js',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { hash } = params;
      const { dev, dir, dist } = next;

      if (!dev) {
        return res.code(404).close();
      }

      next.handleBuildHash('manifest.js', hash, raw.res);
      return res.file(Path.join(dir, dist, 'manifest.js'), { confine: false });
    }
  },
  {
    path: '/_next/{hash}/main.js',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { hash } = params;
      const { dev, dir, dist } = next;

      if (!dev) {
        return res.code(404).close();
      }

      next.handleBuildHash('main.js', hash, raw.res);
      return res.file(Path.join(dir, dist, 'main.js'), { confine: false });
    }
  },
  {
    path: '/_next/{hash}/commons.js',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { hash } = params;
      const { dev, dir, dist } = next;

      if (!dev) {
        return res.code(404).close();
      }

      next.handleBuildHash('commons.js', hash, raw.res);
      return res.file(Path.join(dir, dist, 'commons.js'), { confine: false });
    }
  },
  {
    path: '/_next/{buildId}/page/_error*',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { buildId } = params;
      const { dir, dist } = next;

      if (next.handleBuildId(buildId, raw.res)) {
        return res.file(Path.join(dir, dist, 'bundles/pages/_error.js'), {
          confine: false
        });
      }

      return res.hapi_next_renderError(
        '/_error',
        new Error('INVALID_BUILD_ID'),
        { buildIdMismatched: true },
        next.renderOpts
      );
    }
  },
  {
    path: '/_next/{buildId}/page/{path*}',
    handler: async ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { buildId, path } = params;
      const { dev } = next;

      const page = `/${path}`;

      if (!next.handleBuildId(buildId, raw.res)) {
        return res.hapi_next_renderError(
          page,
          new Error('INVALID_BUILD_ID'),
          { buildIdMismatched: true },
          next.renderOpts
        );
      }

      if (!dev) {
        return res.hapi_next_renderScript(page, next.renderOpts);
      }

      const [error] = await Intercept(next.hotReloader.ensurePage(page));
      if (error) {
        return res.hapi_next_renderError(page, error, {}, next.renderOpts);
      }

      const compilationErr = await next.getCompilationError();
      if (compilationErr) {
        return res.hapi_next_renderError(
          page,
          compilationErr,
          { statusCode: 500 },
          next.renderOpts
        );
      }

      return res.hapi_next_renderScript(page, next.renderOpts);
    }
  },
  {
    // It's very important keep this route's param optional.
    // (but it should support as many as params, seperated by '/')
    // Othewise this will lead to a pretty simple DOS attack.
    // See more: https://github.com/zeit/next.js/issues/2617
    path: '/_next/{path*}',
    handler: ({ raw, params, server }, res) => {
      const { path } = params;

      const _path = Path.join(CLIENT_ROOT, path);

      if (!IsChild(CLIENT_ROOT, _path)) {
        return res.code(403).close();
      }

      return res.file(_path, { confine: false });
    }
  },
  {
    // It's very important keep this route's param optional.
    // (but it should support as many as params, seperated by '/')
    // Othewise this will lead to a pretty simple DOS attack.
    // See more: https://github.com/zeit/next.js/issues/2617
    path: '/static/{path*}',
    handler: ({ raw, params, server }, res) => {
      const { next } = server.plugins[pkg.name];
      const { path } = params;
      const { dir } = next;

      const base = Path.join(dir, 'static');
      const _path = Path.join(base, ...(path || []));

      if (!IsChild(base, _path)) {
        return res.code(403).close();
      }

      return res.file(_path, { confine: false });
    }
  }
];
