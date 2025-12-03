module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress source map warnings from node_modules
      // This fixes the harmless warning from chess.js package
      
      // Find and modify source-map-loader rules
      webpackConfig.module.rules.forEach((rule) => {
        // Handle rules with 'use' array
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach((use) => {
            if (use.loader && use.loader.includes('source-map-loader')) {
              // Exclude node_modules from source map processing
              if (!rule.exclude) {
                rule.exclude = /node_modules/;
              } else if (Array.isArray(rule.exclude)) {
                rule.exclude.push(/node_modules/);
              } else {
                rule.exclude = [rule.exclude, /node_modules/];
              }
            }
          });
        }
        
        // Handle rules with direct loader
        if (rule.loader && rule.loader.includes('source-map-loader')) {
          if (!rule.exclude) {
            rule.exclude = /node_modules/;
          } else if (Array.isArray(rule.exclude)) {
            rule.exclude.push(/node_modules/);
          } else {
            rule.exclude = [rule.exclude, /node_modules/];
          }
        }
      });

      // Also suppress warnings in webpack's ignoreWarnings
      if (!webpackConfig.ignoreWarnings) {
        webpackConfig.ignoreWarnings = [];
      }
      
      webpackConfig.ignoreWarnings.push(
        /Failed to parse source map/,
        /ENOENT: no such file or directory/
      );

      return webpackConfig;
    },
  },
};

