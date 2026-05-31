import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "0.0.0",
    info: {
      title: "API",
      version: "0.0.0",
      description: "API documentation",
    },
    servers: [
      {
        url: "https://securevault.cc/api",
      },
    ],
  },
  apis: ["./src/routes/**/docs/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
