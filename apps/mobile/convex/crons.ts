/**
 * Scheduled jobs — Convex cron functions.
 * Refresh loadshedding data every 4 hours.
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh-loadshedding",
  { hours: 4 },
  internal.alerts.refreshLoadshedding,
  {},
);

export default crons;
