import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeriesPoint } from "../analytics-series";
import { ColumnChart, LineChart, type ChartMetric } from "./CartesianCharts";

const metrics: ChartMetric[] = [
  { key: "opened", label: "Abertos", color: "#2563eb" },
  { key: "success", label: "Com sucesso", color: "#15803d", dash: "6 4" },
];
const points: SeriesPoint[] = [
  {
    date: "2026-11-01",
    opened: 3,
    success: 0,
    failure: 0,
    unknown: 0,
    pending: 3,
  },
  {
    date: "2026-11-02",
    opened: 1,
    success: 2,
    failure: 0,
    unknown: 0,
    pending: 2,
  },
];

function chartSvg(title: string) {
  return screen.getByRole("img", { name: new RegExp(`^Gráfico: ${title}`) });
}

function openDataTable(title: string) {
  const section = screen.getByRole("region", { name: title });
  const details = section.querySelector("details");
  expect(details).not.toBeNull();
  details?.setAttribute("open", "");
  return within(section).getByRole("table", { name: title });
}

describe("Gráficos cartesianos dos indicadores", () => {
  it("identifica os eixos e oferece os valores exatos das linhas", () => {
    const title = "Entradas de teste";
    render(
      <LineChart
        title={title}
        description="Movimentações por dia."
        points={points}
        metrics={metrics}
      />,
    );
    const svg = chartSvg(title);
    expect(within(svg).getByText("Data")).toBeInTheDocument();
    expect(within(svg).getByText("Chamados")).toBeInTheDocument();
    const table = openDataTable(title);
    expect(
      within(table).getByRole("columnheader", { name: "Abertos" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Com sucesso" }),
    ).toBeInTheDocument();
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["3", "0"]);
    expect(
      within(rows[2])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "2"]);
  });

  it("apresenta categorias e séries de colunas sem perder as contagens", () => {
    const title = "Equipe de teste";
    render(
      <ColumnChart
        title={title}
        description="Volume por equipe."
        xLabel="Equipe"
        metrics={metrics}
        rows={[
          { label: "TI / Rede", values: [4, 2] },
          { label: "Sem equipe alocada", values: [1, 0] },
        ]}
      />,
    );
    const svg = chartSvg(title);
    expect(within(svg).getByText("Equipe")).toBeInTheDocument();
    expect(within(svg).getByText("Chamados")).toBeInTheDocument();
    const table = openDataTable(title);
    expect(
      within(table).getByRole("rowheader", { name: "TI / Rede" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "Sem equipe alocada" }),
    ).toBeInTheDocument();
    const rows = within(table).getAllByRole("row");
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["4", "2"]);
    expect(
      within(rows[2])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "0"]);
  });

  it("mantém um ponto único e quantidades grandes com geometria finita", () => {
    const title = "Ponto único";
    render(
      <LineChart
        title={title}
        description="Um dia com chamados."
        points={[{ ...points[0], opened: 10000 }]}
        metrics={metrics}
      />,
    );
    const svg = chartSvg(title);
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
    expect(openDataTable(title)).toHaveTextContent("10.000");
  });

  it("exibe eixos e estado vazio quando não há pontos", () => {
    const title = "Sem movimentações";
    render(
      <LineChart
        title={title}
        description="Período sem atividade."
        points={[]}
        metrics={metrics}
      />,
    );
    const svg = chartSvg(title);
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
    expect(within(svg).getByText("Chamados")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: title })).toHaveTextContent(
      /nenhum|sem movimentação/i,
    );
  });

  it("não divide por zero em séries e categorias com contagem zero", () => {
    const lineTitle = "Linhas zeradas";
    const columnTitle = "Colunas zeradas";
    render(
      <>
        <LineChart
          title={lineTitle}
          description="Sem atividade."
          points={[{ ...points[0], opened: 0, success: 0, pending: 0 }]}
          metrics={metrics}
        />
        <ColumnChart
          title={columnTitle}
          description="Sem demanda."
          xLabel="Situação"
          rows={[{ label: "Em triagem", values: [0, 0] }]}
          metrics={metrics}
        />
      </>,
    );
    for (const title of [lineTitle, columnTitle]) {
      expect(chartSvg(title).outerHTML).not.toMatch(/NaN|Infinity/);
      expect(openDataTable(title)).toHaveTextContent("0");
    }
  });
});
