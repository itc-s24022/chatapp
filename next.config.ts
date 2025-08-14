// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config: any) => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"]
        });
        return config;
    }
};

module.exports = nextConfig;