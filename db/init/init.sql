CREATE TABLE IF NOT EXISTS user_login (
  user_login_id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  avatar  TEXT,
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'user',
  refresh_token TEXT,
  reset_password_token VARCHAR(255),
  reset_password_expires BIGINT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users(
  users_id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  phone_number VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

);


CREATE TABLE refresh_tokens (
  refresh_token_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(users_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE password_reset_tokens(
  password_reset_token_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  categories_id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  type(enum:'quiz', 'article', 'video'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_index (for display ordering) INTEGER,
  is_active (boolean),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes(
  quiz_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(categories_id) ON DELETE SET NULL,
  difficulty_level(enum:'easy', 'medium', 'hard'),
  passing_score (e.g., 43 out of 50 for UK theory test)
  total_questions (auto-calculated or set manually)
  time_limit_minutes (e.g., 57 minutes for official test)
  is_mock_test (boolean - differentiate practice vs mock tests)
  is_active (boolean)
  order_index (display order within category)
  thumbnail_url (optional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE questions (
  questions_id (Primary Key)
  quiz_id (Foreign Key → quizzes)
  question_text (the actual question)
  question_type (enum: 'multiple_choice', 'true_false', 'multiple_select')
  option_a (first answer choice)
  option_b (second answer choice)
  option_c (third answer choice)
  option_d (fourth answer choice)
  correct_answer (e.g., 'A', 'B', 'C', 'D' or comma-separated for multiple select)
  explanation (why the answer is correct - shown after submission)
  image_url (link to question diagram/image if applicable)
  image_alt_text (accessibility)
  difficulty_level (optional, for smart recommendations)
  points (default 1, but could vary)
  order_index (question order in quiz)
  times_answered_correctly (for statistics)
  times_answered_incorrectly (for statistics)
  is_active (boolean)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMPcreated_at
  updated_at
);

CREATE TABLE quiz_attempts (
  quiz_attempts_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(users_id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER,
  percentage FLOAT,
  is_passed BOOLEAN,
  correct_answers INTEGER,
  incorrect_answers INTEGER,
  time_taken_seconds INTEGER,
  attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attempt_number (1st, 2nd, 3rd attempt at this quiz)
  is_passed BOOLEAN
);

CREATE TABLE user_answers(
  user_answers_id SERIAL PRIMARY KEY,
  quiz_attempt_id INTEGER REFERENCES quiz_attempts(quiz_attempts_id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(questions_id) ON DELETE CASCADE,
  selected_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   
);

CREATE TABLE videos(
  video_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(categories_id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmarks(
  bookmark_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(users_id) ON DELETE CASCADE,
  content_type(enum:'quiz', 'article', 'video'),
  content_id INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

