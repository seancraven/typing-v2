export type User = {
  username: string;
  password: string;
  email: string;
};

export type TypeData = {
  error_rate: number;
  wpm: number;
  typing_length: number;
  title: string;
  lang: string;
  type_time_s: number;
  start_idx: number;
  end_idx: number;
  topic_id: number;
};

export type TopicsData = {
  lang: string;
  topics: [number, string][];
};

export type MaxProgressData = {
  lang: string;
  progress: number;
  final_idx: number;
  topic_id: number;
  title: string;
};

export type LangData = {
  langs: string[];
  user_langs: string[];
};
