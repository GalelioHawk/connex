import axios from 'axios';
import { redis } from './redis';

const BASE_URL = 'https://developer.sepush.co.za/business/2.0';
const API_KEY  = process.env.ESKOMSEPUSH_API_KEY!;
const CACHE_TTL = Number(process.env.ESKOMSEPUSH_CACHE_TTL_SECONDS ?? 14400); // 4 hours

const STAGE_CACHE_KEY    = 'esp:stage';
const SCHEDULE_CACHE_KEY = (suburbId: string) => `esp:schedule:${suburbId}`;

interface EspStatus {
  status: {
    capetown: { name: string; stage: string; stage_updated: string };
    eskom:    { name: string; stage: string; stage_updated: string };
  };
}

interface EspSchedule {
  schedule: {
    days: Array<{
      date: string;
      name: string;
      stages: string[][];
    }>;
  };
  info: {
    name: string;
    region: string;
  };
}

export interface LoadsheddingStage {
  eskom_stage: number;
  capetown_stage: number;
  updated_at: string;
}

export interface SuburbSchedule {
  suburb_name: string;
  region: string;
  days: Array<{
    date: string;
    name: string;
    stages: string[][];
  }>;
}

export async function getCurrentStage(): Promise<LoadsheddingStage> {
  const cached = await redis.get(STAGE_CACHE_KEY);
  if (cached) return JSON.parse(cached) as LoadsheddingStage;

  const { data } = await axios.get<EspStatus>(`${BASE_URL}/status`, {
    headers: { Token: API_KEY },
  });

  const result: LoadsheddingStage = {
    eskom_stage:    parseInt(data.status.eskom.stage, 10)    || 0,
    capetown_stage: parseInt(data.status.capetown.stage, 10) || 0,
    updated_at:     new Date().toISOString(),
  };

  await redis.set(STAGE_CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL);
  return result;
}

export async function getSuburbSchedule(suburbId: string): Promise<SuburbSchedule> {
  const cacheKey = SCHEDULE_CACHE_KEY(suburbId);
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as SuburbSchedule;

  const { data } = await axios.get<EspSchedule>(`${BASE_URL}/area`, {
    headers: { Token: API_KEY },
    params:  { id: suburbId },
  });

  const result: SuburbSchedule = {
    suburb_name: data.info.name,
    region:      data.info.region,
    days:        data.schedule.days,
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
  return result;
}

export async function invalidateStageCache(): Promise<void> {
  await redis.del(STAGE_CACHE_KEY);
}
