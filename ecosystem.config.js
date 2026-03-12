module.exports = {
    apps: [
        {
            name: "ads-campaign",
            script: "server/src/server.js",
            instances: 1,
            exec_mode: "fork",
            watch: false,
            autorestart: true,
            max_memory_restart: "500M",

            env_staging: {
                NODE_ENV: "staging",
                PORT: 7500
            }
        }
    ]
};
