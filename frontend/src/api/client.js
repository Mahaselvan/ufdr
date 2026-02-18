import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

export async function fetchDashboard() {
  const { data } = await api.get("/dashboard");
  return data;
}

export async function uploadUfdr(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/upload-ufdr", formData);
  return data;
}

export async function runQuery(question, scope = { sourceScope: "latest", sourceFile: "" }) {
  const { data } = await api.post("/query", {
    question,
    sourceScope: scope.sourceScope,
    sourceFile: scope.sourceFile
  });
  return data;
}

export async function fetchQueryExamples() {
  const { data } = await api.get("/query/examples");
  return data.examples || [];
}

export async function fetchQuerySources() {
  const { data } = await api.get("/query/sources");
  return data.sources || [];
}

export async function fetchLinks(scope = { sourceScope: "latest", sourceFile: "" }) {
  const { data } = await api.get("/links", {
    params: {
      sourceScope: scope.sourceScope,
      sourceFile: scope.sourceFile
    }
  });
  return data;
}

export async function fetchReports(scope = { sourceScope: "all", sourceFile: "" }) {
  const { data } = await api.get("/reports", {
    params: {
      sourceScope: scope.sourceScope,
      sourceFile: scope.sourceFile
    }
  });
  return data;
}

export async function generateReport(payload) {
  const response = await api.post("/reports/generate", payload, {
    responseType: "blob"
  });
  const contentDisposition = response.headers["content-disposition"] || "";
  const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match?.[1] || "Investigation_Report.pdf";
  return { blob: response.data, filename };
}

export default api;
