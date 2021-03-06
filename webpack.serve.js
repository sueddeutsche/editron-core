/* eslint-env node */
const path = require("path");
const config = require("./webpack.build");

config.plugins = []; // reset

const app = process.env.APP || "editron";

// LOCAL
// config.entry["index.html"] = path.join(__dirname, "test", "support", "local-setup.html");
// config.entry["editron.css"] = path.join(__dirname, "editron.scss");

// app/array
config.entry["editron"] = path.join(__dirname, "app", app, "index.ts");

config.module.rules.push({
    test: [/wysiwyg-editor.scss/, /editron.scss$/],
    use: [
        "file-loader?name=[name].css",
        "extract-loader",
        "css-loader",
        {
            loader: "sass-loader",
            options: {
                sassOptions: {
                    includePaths: [path.join(__dirname, "node_modules")]
                }
            }
        }
    ]
});

config.module.rules.push(
    {
        test: /.*\.scss$/,
        use: [
            "style-loader",
            "css-loader",
            {
                loader: "sass-loader",
                options: {
                    sassOptions: {
                        includePaths: [path.join(__dirname, "node_modules")]
                    }
                }
            }
        ]
    },
);

module.exports = config;
