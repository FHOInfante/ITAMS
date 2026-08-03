import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

const loadYaml = (path: string) => YAML.load(path);

const mainDoc = loadYaml("./src/docs/main.yaml");

const modulePaths: string[] = [
  "./src/docs/auth.yaml",
  "./src/docs/users.yaml",
  "./src/docs/permissions.yaml",
  "./src/docs/computers.yaml",
  "./src/docs/software.yaml",
  "./src/docs/printers.yaml",
  "./src/docs/ups.yaml",
  "./src/docs/network_devices.yaml",
  "./src/docs/purchase_requests.yaml",
  "./src/docs/endusers.yaml",
  "./src/docs/departments.yaml",
  "./src/docs/peripherals.yaml",
  "./src/docs/programs.yaml",
  "./src/docs/vendors.yaml",
  "./src/docs/categories.yaml",
  "./src/docs/reports.yaml",
  "./src/docs/audit_logs.yaml",
];

const mergeSwaggerDocs = (documents: any[], header: any): object => {
  const merged = documents.reduce(
    (acc: any, doc: any) => ({
      ...acc,
      paths: {
        ...acc.paths,
        ...doc.paths,
      },
      components: {
        schemas: {
          ...acc.components?.schemas,
          ...doc.components?.schemas,
        },
        responses: {
          ...acc.components?.responses,
          ...doc.components?.responses,
        },
        securitySchemes: {
          ...acc.components?.securitySchemes,
          ...doc.components?.securitySchemes,
        },
      },
    }),
    {},
  );

  return {
    openapi: header.openapi,
    info: header.info,
    servers: header.servers,
    tags: header.tags,
    externalDocs: header.externalDocs,
    ...merged,
  };
};

export const swaggerDocs = (app: any) => {
  const loadedDocs = modulePaths.map((filePath) => loadYaml(filePath));
  const mergedDoc = mergeSwaggerDocs(loadedDocs, mainDoc);

  app.use(
    "/api/docs",
    swaggerUi.serveFiles(mergedDoc, {}),
    swaggerUi.setup(mergedDoc),
  );
};
