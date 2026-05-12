import {useEffect, useMemo, useState, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import {getSupabase} from '@site/src/lib/supabase';
import styles from './checklist.module.css';

type TaskKey = 'tech' | 'english' | 'exercise';

type Task = {
  key: TaskKey;
  label: string;
  icon: string;
  target: string;
};

const TASKS: Task[] = [
  {key: 'tech', label: 'Learn tech', icon: '💻', target: '2 hours'},
  {key: 'english', label: 'Learn English', icon: '🗣️', target: '30 minutes'},
  {key: 'exercise', label: 'Do exercise', icon: '🏃', target: '30 minutes'},
];

type DayRecord = Record<TaskKey, boolean>;
type Storage = Record<string, DayRecord>;

const TABLE = 'daily_checklist';

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function emptyDay(): DayRecord {
  return {tech: false, english: false, exercise: false};
}

function countDone(rec: DayRecord): number {
  return Object.values(rec).filter(Boolean).length;
}

function ChecklistApp(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const supabaseUrl = siteConfig.customFields?.supabaseUrl as
    | string
    | undefined;
  const supabaseKey = siteConfig.customFields?.supabasePublishableKey as
    | string
    | undefined;
  const supabase = useMemo(
    () => getSupabase(supabaseUrl, supabaseKey),
    [supabaseUrl, supabaseKey],
  );

  const [date, setDate] = useState<string>(todayISO());
  const [store, setStore] = useState<Storage>({});
  const [draft, setDraft] = useState<DayRecord>(emptyDay());
  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'error' | 'unconfigured'
  >('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  useEffect(() => {
    if (!supabase) {
      setLoadState('unconfigured');
      return;
    }
    let cancelled = false;
    (async () => {
      const {data, error} = await supabase
        .from(TABLE)
        .select('date,tech,english,exercise')
        .order('date', {ascending: false})
        .limit(400);

      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message);
        setLoadState('error');
        return;
      }
      const next: Storage = {};
      for (const row of data ?? []) {
        next[row.date as string] = {
          tech: !!row.tech,
          english: !!row.english,
          exercise: !!row.exercise,
        };
      }
      setStore(next);
      setLoadState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    setDraft(store[date] ?? emptyDay());
    setSavingState('idle');
  }, [date, store]);

  const toggle = (key: TaskKey) => {
    setDraft((prev) => ({...prev, [key]: !prev[key]}));
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    if (date > todayISO()) {
      setErrorMsg('Cannot submit for a future date.');
      return;
    }
    if (store[date]) {
      setErrorMsg('This day was already submitted. Delete it first to re-submit.');
      return;
    }
    setSavingState('saving');
    setErrorMsg(null);
    const {error} = await supabase
      .from(TABLE)
      .insert({
        date,
        tech: draft.tech,
        english: draft.english,
        exercise: draft.exercise,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      setErrorMsg(error.message);
      setSavingState('idle');
      return;
    }
    setStore((prev) => ({...prev, [date]: draft}));
    setSavingState('saved');
  };

  const handleReset = () => setDraft(emptyDay());

  const doneCount = countDone(draft);
  const totalTasks = TASKS.length;
  const today = todayISO();
  const isFuture = date > today;
  const alreadySubmitted = !!store[date];
  const isLocked = isFuture || alreadySubmitted;

  const [hoverCell, setHoverCell] = useState<{
    date: string;
    x: number;
    y: number;
  } | null>(null);

  const graphData = useMemo(() => {
    const WEEKS = 26;
    const totalDays = WEEKS * 7;
    const today = new Date(todayISO() + 'T00:00:00');
    const todayDow = today.getDay();
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - todayDow));

    const cells: {date: string; done: number; inFuture: boolean}[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const rec = store[iso];
      cells.push({
        date: iso,
        done: rec ? countDone(rec) : 0,
        inFuture: d > today,
      });
    }

    const weeks: (typeof cells)[] = [];
    for (let w = 0; w < WEEKS; w++) {
      weeks.push(cells.slice(w * 7, w * 7 + 7));
    }
    return weeks;
  }, [store]);

  const stats = useMemo(() => {
    const days = Object.values(store);
    const submitted = days.length;
    const fullDays = days.filter((d) => countDone(d) === TASKS.length).length;
    const totalTasksDone = days.reduce((sum, d) => sum + countDone(d), 0);

    const sortedDates = Object.keys(store).sort();
    let currentStreak = 0;
    const today = new Date(todayISO() + 'T00:00:00');
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const rec = store[iso];
      if (rec && countDone(rec) === TASKS.length) {
        currentStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    return {submitted, fullDays, totalTasksDone, currentStreak, sortedDates};
  }, [store]);

  if (loadState === 'unconfigured') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Heading as="h2">⚠ Supabase not configured</Heading>
          <p>
            Set <code>SUPABASE_URL</code> and{' '}
            <code>SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code> (local)
            or your hosting provider's environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Heading as="h1">📋 Daily Checklist</Heading>
        <p className={styles.subtitle}>
          Track daily learning & training habits
        </p>
      </div>

      {errorMsg && (
        <div className={`${styles.card} ${styles.errorCard}`}>
          ⚠ {errorMsg}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.dateRow}>
          <label>
            <strong>Date: </strong>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className={styles.dateInput}
            />
          </label>
          <div className={styles.summary}>
            <span
              className={
                doneCount === totalTasks ? styles.completed : styles.pending
              }>
              {doneCount}/{totalTasks} done
            </span>
          </div>
        </div>

        <div className={styles.taskList}>
          {TASKS.map((task) => {
            const checked = draft[task.key];
            return (
              <label
                key={task.key}
                className={`${styles.taskItem} ${
                  isLocked ? styles.taskItemLocked : ''
                }`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isLocked}
                  onChange={() => toggle(task.key)}
                />
                <span className={styles.taskIcon}>{task.icon}</span>
                <span
                  className={`${styles.taskLabel} ${
                    checked ? styles.taskDone : ''
                  }`}>
                  {task.label} — <em>{task.target}</em>
                </span>
              </label>
            );
          })}
        </div>

        {isFuture && (
          <div className={styles.lockNotice}>
            🔒 Cannot submit for a future date.
          </div>
        )}
        {!isFuture && alreadySubmitted && (
          <div className={styles.lockNotice}>
            ✓ Already submitted for {date}. Delete it below to re-submit.
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSubmit}
            disabled={
              savingState === 'saving' || loadState !== 'ready' || isLocked
            }>
            {savingState === 'saving' ? 'Saving…' : '💾 Submit'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleReset}
            disabled={isLocked}>
            ↺ Reset
          </button>
          {savingState === 'saved' && (
            <span className={styles.completed} style={{alignSelf: 'center'}}>
              ✓ Saved to Supabase
            </span>
          )}
          {loadState === 'loading' && (
            <span className={styles.pending} style={{alignSelf: 'center'}}>
              Loading…
            </span>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <Heading as="h2" className={styles.historyTitle}>
          📅 Activity (last 26 weeks)
        </Heading>

        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.submitted}</div>
            <div className={styles.statLabel}>Days submitted</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.fullDays}</div>
            <div className={styles.statLabel}>Perfect days</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.totalTasksDone}</div>
            <div className={styles.statLabel}>Tasks done</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>🔥 {stats.currentStreak}</div>
            <div className={styles.statLabel}>Current streak</div>
          </div>
        </div>

        <div className={styles.graphWrapper}>
          <div className={styles.dayLabels}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className={styles.graph}>
            {graphData.map((week, wi) => (
              <div key={wi} className={styles.week}>
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    className={`${styles.cell} ${
                      cell.inFuture
                        ? styles.cellFuture
                        : styles[`cellL${cell.done}` as const]
                    }`}
                    onMouseEnter={(e) =>
                      setHoverCell({
                        date: cell.date,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseMove={(e) =>
                      setHoverCell({
                        date: cell.date,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHoverCell(null)}
                    onClick={() => !cell.inFuture && setDate(cell.date)}
                  />
                ))}
              </div>
            ))}
          </div>
          {hoverCell &&
            (() => {
              const rec = store[hoverCell.date];
              const isCellFuture = hoverCell.date > today;
              return (
                <div
                  className={styles.tooltip}
                  style={{left: hoverCell.x, top: hoverCell.y}}>
                  <div className={styles.tooltipDate}>{hoverCell.date}</div>
                  {isCellFuture ? (
                    <div className={styles.tooltipEmpty}>Future date</div>
                  ) : rec ? (
                    <>
                      <div className={styles.tooltipSummary}>
                        {countDone(rec)}/{TASKS.length} completed
                      </div>
                      <ul className={styles.tooltipList}>
                        {TASKS.map((t) => (
                          <li key={t.key}>
                            <span>{rec[t.key] ? '✅' : '⬜'}</span>
                            <span>
                              {t.icon} {t.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className={styles.tooltipEmpty}>No submission</div>
                  )}
                </div>
              );
            })()}
          <div className={styles.legend}>
            <span>Less</span>
            <span className={`${styles.cell} ${styles.cellL0}`} />
            <span className={`${styles.cell} ${styles.cellL1}`} />
            <span className={`${styles.cell} ${styles.cellL2}`} />
            <span className={`${styles.cell} ${styles.cellL3}`} />
            <span>More</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ChecklistPage(): ReactNode {
  return (
    <Layout
      title="Daily Checklist"
      description="Track daily learning & training habits">
      <main>
        <BrowserOnly fallback={<div className={styles.container}>Loading…</div>}>
          {() => <ChecklistApp />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
