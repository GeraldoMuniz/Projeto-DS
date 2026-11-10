import { useId } from "react";
import type { SeriesPoint } from "../analytics-series";
import { formatDate } from "../format";
import "./CartesianCharts.css";

export interface ChartMetric {
  key: string;
  label: string;
  color: string;
  dash?: string;
}

export interface ColumnRow {
  label: string;
  axisLabel?: string;
  values: number[];
  color?: string;
}

const NUMBER = new Intl.NumberFormat("pt-BR");
const COMPACT = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const LEFT = 60;
const TOP = 24;
const WIDTH = 396;
const HEIGHT = 174;
const count = (value: number) =>
  Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value))
    : 0;

function scale(values: number[]) {
  const maximum = Math.max(1, ...values.map(count));
  const rawStep = Math.max(1, Math.ceil(maximum / 4));
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    ([1, 2, 5, 10].find((candidate) => candidate * power >= rawStep) ?? 10) *
    power;
  return {
    step,
    y: (value: number) => TOP + HEIGHT - (count(value) / (step * 4)) * HEIGHT,
  };
}

function Axes({
  step,
  y,
  xLabel,
  xLabelY = 276,
}: {
  step: number;
  y: (value: number) => number;
  xLabel: string;
  xLabelY?: number;
}) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => {
        const value = index * step;
        return (
          <g key={index}>
            <line
              x1={LEFT}
              x2={LEFT + WIDTH}
              y1={y(value)}
              y2={y(value)}
              className="report-plot-grid"
            />
            <text x={LEFT - 10} y={y(value) + 5} textAnchor="end">
              {value >= 10_000 ? COMPACT.format(value) : NUMBER.format(value)}
            </text>
          </g>
        );
      })}
      <line
        x1={LEFT}
        x2={LEFT}
        y1={TOP}
        y2={TOP + HEIGHT}
        className="report-plot-axis"
      />
      <line
        x1={LEFT}
        x2={LEFT + WIDTH}
        y1={TOP + HEIGHT}
        y2={TOP + HEIGHT}
        className="report-plot-axis"
      />
      <text
        className="report-axis-title"
        transform={`translate(15 ${TOP + HEIGHT / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        Chamados
      </text>
      <text
        className="report-axis-title"
        x={LEFT + WIDTH / 2}
        y={xLabelY}
        textAnchor="middle"
      >
        {xLabel}
      </text>
    </>
  );
}

function Legend({ metrics }: { metrics: ChartMetric[] }) {
  return (
    <ul className="report-plot-legend" aria-label="Legenda do gráfico">
      {metrics.map((metric) => (
        <li key={metric.key}>
          <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
            <line
              x1="0"
              x2="24"
              y1="6"
              y2="6"
              stroke={metric.color}
              strokeWidth="3"
              strokeDasharray={metric.dash}
            />
          </svg>
          {metric.label}
        </li>
      ))}
    </ul>
  );
}

function pointValue(point: SeriesPoint, metric: ChartMetric) {
  const value = point[metric.key as keyof SeriesPoint];
  return typeof value === "number" ? count(value) : 0;
}

export function LineChart({
  title,
  description,
  points,
  metrics,
}: {
  title: string;
  description: string;
  points: SeriesPoint[];
  metrics: ChartMetric[];
}) {
  const id = useId();
  const { step, y } = scale(
    points.flatMap((point) =>
      metrics.map((metric) => pointValue(point, metric)),
    ),
  );
  const x = (index: number) =>
    points.length < 2
      ? LEFT + WIDTH / 2
      : LEFT + (index * WIDTH) / (points.length - 1);
  const labelCount = Math.min(5, points.length);
  const labels = new Set(
    Array.from({ length: labelCount }, (_, index) =>
      labelCount < 2
        ? 0
        : Math.round((index * (points.length - 1)) / (labelCount - 1)),
    ),
  );
  const showYear =
    points.length > 0 &&
    points[0].date.slice(0, 4) !== points.at(-1)?.date.slice(0, 4);
  return (
    <section className="panel report-cartesian-chart" aria-label={title}>
      <h3>{title}</h3>
      <p className="muted report-description">{description}</p>
      <Legend metrics={metrics} />
      <svg
        viewBox="0 0 480 292"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        className="report-cartesian-svg"
      >
        <title id={`${id}-title`}>Gráfico: {title}</title>
        <desc id={`${id}-description`}>
          Eixo X: Data. Eixo Y: Chamados. {description} Os valores exatos estão
          na tabela do gráfico.
        </desc>
        <Axes step={step} y={y} xLabel="Data" />
        {[...labels].map((index) => (
          <text
            key={index}
            x={x(index)}
            y={TOP + HEIGHT + 26}
            textAnchor={
              points.length < 2
                ? "middle"
                : index === 0
                  ? "start"
                  : index === points.length - 1
                    ? "end"
                    : "middle"
            }
          >
            {formatDate(points[index].date).slice(0, showYear ? undefined : 5)}
          </text>
        ))}
        {metrics.map((metric) => (
          <g key={metric.key}>
            <polyline
              points={points
                .map(
                  (point, index) =>
                    `${x(index)},${y(pointValue(point, metric))}`,
                )
                .join(" ")}
              fill="none"
              stroke={metric.color}
              strokeWidth="2.6"
              strokeDasharray={metric.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point, index) => (
              <circle
                key={point.date}
                cx={x(index)}
                cy={y(pointValue(point, metric))}
                r="3.5"
                fill={metric.color}
                className={
                  points.length > 45 ? "report-dense-point" : undefined
                }
              >
                <title>
                  {formatDate(point.date)} · {metric.label}:{" "}
                  {NUMBER.format(pointValue(point, metric))}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {!points.some((point) =>
        metrics.some((metric) => pointValue(point, metric) > 0),
      ) && (
        <p className="muted report-plot-empty">
          Nenhuma movimentação com datas conhecidas neste intervalo.
        </p>
      )}
      <details className="report-chart-data">
        <summary>Ver dados de {title.toLocaleLowerCase("pt-BR")}</summary>
        <div
          className="report-chart-data-scroll"
          tabIndex={0}
          role="region"
          aria-label={`Tabela: ${title}`}
        >
          <table className="report-table">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Início do intervalo</th>
                {metrics.map((metric) => (
                  <th scope="col" key={metric.key}>
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{formatDate(point.date)}</th>
                  {metrics.map((metric) => (
                    <td key={metric.key}>
                      {NUMBER.format(pointValue(point, metric))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function wrapLabel(label: string) {
  const words = label
    .replaceAll("-", "- ")
    .split(/\s+/)
    .flatMap((word) => word.match(/.{1,10}/g) ?? []);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 10)
      lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

export function ColumnChart({
  title,
  description,
  xLabel,
  rows,
  metrics,
}: {
  title: string;
  description: string;
  xLabel: string;
  rows: ColumnRow[];
  metrics: ChartMetric[];
}) {
  const id = useId();
  const { step, y } = scale(rows.flatMap((row) => row.values));
  const slot = WIDTH / Math.max(1, rows.length);
  const groupWidth = Math.min(slot * 0.7, 92);
  const barWidth = groupWidth / Math.max(1, metrics.length);
  const maxLines = Math.max(
    1,
    ...rows.map((row) => wrapLabel(row.axisLabel ?? row.label).length),
  );
  const xLabelY = TOP + HEIGHT + 28 + maxLines * 16 + 25;
  return (
    <section className="panel report-cartesian-chart" aria-label={title}>
      <h3>{title}</h3>
      <p className="muted report-description">{description}</p>
      {metrics.length > 1 && <Legend metrics={metrics} />}
      <svg
        viewBox={`0 0 480 ${xLabelY + 16}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        className="report-cartesian-svg report-column-svg"
      >
        <title id={`${id}-title`}>Gráfico: {title}</title>
        <desc id={`${id}-description`}>
          Eixo X: {xLabel}. Eixo Y: Chamados. {description} Os valores exatos
          estão na tabela do gráfico.
        </desc>
        <Axes step={step} y={y} xLabel={xLabel} xLabelY={xLabelY} />
        {rows.map((row, index) => {
          const center = LEFT + slot * (index + 0.5);
          return (
            <g key={row.label}>
              {metrics.map((metric, metricIndex) => {
                const value = count(row.values[metricIndex] ?? 0);
                return (
                  <g key={metric.key}>
                    <rect
                      x={center - groupWidth / 2 + metricIndex * barWidth + 1}
                      y={y(value)}
                      width={Math.max(1, barWidth - 2)}
                      height={TOP + HEIGHT - y(value)}
                      rx="2"
                      fill={
                        metrics.length === 1
                          ? (row.color ?? metric.color)
                          : metric.color
                      }
                    >
                      <title>
                        {row.label} · {metric.label}: {NUMBER.format(value)}
                      </title>
                    </rect>
                    {metrics.length === 1 && (
                      <text
                        x={center}
                        y={y(value) - 7}
                        textAnchor="middle"
                        className="report-column-value"
                      >
                        {value >= 10_000
                          ? COMPACT.format(value)
                          : NUMBER.format(value)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={center}
                y={TOP + HEIGHT + 26}
                textAnchor="middle"
                className="report-category-label"
              >
                {wrapLabel(row.axisLabel ?? row.label).map(
                  (line, lineIndex) => (
                    <tspan key={lineIndex} x={center} dy={lineIndex ? 16 : 0}>
                      {line}
                    </tspan>
                  ),
                )}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="report-chart-data">
        <summary>Ver dados de {title.toLocaleLowerCase("pt-BR")}</summary>
        <div
          className="report-chart-data-scroll"
          tabIndex={0}
          role="region"
          aria-label={`Tabela: ${title}`}
        >
          <table className="report-table">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">{xLabel}</th>
                {metrics.map((metric) => (
                  <th scope="col" key={metric.key}>
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {metrics.map((metric, index) => (
                    <td key={metric.key}>
                      {NUMBER.format(count(row.values[index] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
