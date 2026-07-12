import { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from './SensitivityChart.module.css';

export default memo(function SensitivityChart({ data, alternatives, criterionName }: any) {
  if (!data || !alternatives) return null;

  const chartData = data.map(d => {
    const point = { weight: (d.weight * 100).toFixed(0) + '%' };
    alternatives.forEach((alt, i) => {
      point[alt.name] = (d.scores[i] * 100);
    });
    return point;
  });

  return (
    <div className={styles.chartContainer} role="img" aria-label={`${criterionName} 가중치 변화에 따른 대안 순위 차트`}>
      <h3 className={styles.chartTitle}>
        {criterionName} 가중치 변화에 따른 대안 순위
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <XAxis dataKey="weight" interval={9} />
          <YAxis tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
          <Legend />
          {alternatives.map((alt: any, i: number) => (
            <Line
              key={alt.id}
              type="monotone"
              dataKey={alt.name}
              stroke={LEVEL_COLORS[i % LEVEL_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
})
