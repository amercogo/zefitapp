"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { useState } from "react";

export type AttendancePoint = {
    date: string;   // npr. "2025-11-10"
    count: number;  // broj dolazaka
};

export type PaymentPoint = {
    date: string;   // npr. "2025-11-10"
    amount: number; // iznos uplata tog dana
};

type Props = {
    attendanceData: AttendancePoint[];
    paymentData: PaymentPoint[];
};

export function AttendanceChart({ attendanceData, paymentData }: Props) {
    const [activeTab, setActiveTab] = useState<"attendance" | "payments">(
        "attendance",
    );

    const hasAttendance = attendanceData && attendanceData.length > 0;
    const hasPayments = paymentData && paymentData.length > 0;

    const isAttendance = activeTab === "attendance";

    // Normaliziramo podatke na { date, value }
    const chartData = isAttendance
        ? attendanceData.map((d) => ({ date: d.date, value: d.count }))
        : paymentData.map((d) => ({ date: d.date, value: d.amount }));

    const hasData = chartData.length > 0;

    return (
        <section
            className="
        rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40
        p-5 sm:p-6 lg:p-7 shadow-[0_18px_40px_rgba(0,0,0,0.7)]
      "
        >
            {/* Header sa tabovima */}
            <header className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--color-yellow)] text-lg">📈</span>
                    <h2 className="text-sm sm:text-base font-extrabold text-[var(--color-yellow)]">
                        Grafik
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => setActiveTab("attendance")}
                        className={`
              px-3 py-1.5 rounded-full transition
              ${
                            isAttendance
                                ? "bg-[var(--color-yellow)] text-black shadow-[0_8px_18px_rgba(0,0,0,0.7)]"
                                : "bg-black/60 text-white/45 border border-white/10 hover:bg-white/10"
                        }
            `}
                    >
                        Dolasci
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("payments")}
                        className={`
              px-3 py-1.5 rounded-full transition
              ${
                            !isAttendance
                                ? "bg-[var(--color-yellow)] text-black shadow-[0_8px_18px_rgba(0,0,0,0.7)]"
                                : "bg-black/60 text-white/45 border border-white/10 hover:bg-white/10"
                        }
            `}
                    >
                        Uplate
                    </button>
                </div>
            </header>

            {/* Sam graf */}
            <div className="h-64 w-full rounded-xl bg-black/40 border border-white/10 px-2 py-3">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
                        >
                            <CartesianGrid
                                stroke="rgba(255,255,255,0.08)"
                                strokeDasharray="3 3"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                stroke="#AAAAAA"
                                tick={{ fontSize: 11, fill: "#DDDDDD" }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#AAAAAA"
                                tick={{ fontSize: 11, fill: "#DDDDDD" }}
                                tickLine={false}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#111111",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255,245,47,0.4)",
                                    padding: "8px 10px",
                                }}
                                labelStyle={{ color: "#ffffff", fontSize: 12 }}
                                itemStyle={{ color: "#FFF52F", fontSize: 12 }}
                                formatter={(value: number) =>
                                    isAttendance
                                        ? [`${value} dolazaka`, "Dolasci"]
                                        : [`${value.toFixed(2)} KM`, "Uplate"]
                                }
                                cursor={{
                                    stroke: "rgba(255,255,255,0.15)",
                                    strokeWidth: 1,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#FFF52F"
                                strokeWidth={3}
                                dot={{
                                    r: 4,
                                    stroke: "#000000",
                                    strokeWidth: 1,
                                    fill: "#FFF52F",
                                }}
                                activeDot={{
                                    r: 6,
                                    stroke: "#ffffff",
                                    strokeWidth: 2,
                                    fill: "#FFF52F",
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-white/60">
                        {isAttendance
                            ? "Nema dolazaka u odabranom periodu."
                            : "Nema uplata u odabranom periodu."}
                    </div>
                )}
            </div>

            {/* Kratki hint ispod, opcionalno */}
            <p className="mt-2 text-[11px] text-white/45">
                {isAttendance
                    ? "Broj dolazaka po danu."
                    : "Ukupan iznos uplata po danu (KM)."}
            </p>
        </section>
    );
}
