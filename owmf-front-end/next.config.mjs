/** @type {import('next').NextConfig} */
const nextConfig = {
  //output: "export",
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.s(par)?ql$/,
      type: 'asset/source',
      exclude: /node_modules/,
    });

    return config
  },
  redirects() {
    return [
      {
        source: '/taginfo.json',
        destination: '/taginfo',
        permanent: true,
      },
      {
        source: '/toolinfo.json',
        destination: '/toolinfo',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
