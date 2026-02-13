-- Quiz Application Core Tables

-- Categories (for organizing quizzes, videos, articles)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(50) CHECK (type IN ('quiz', 'article', 'video')),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order_index ON categories(order_index);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  passing_score INTEGER DEFAULT 43, -- e.g., 43 out of 50 for UK theory test
  total_questions INTEGER,
  time_limit_minutes INTEGER DEFAULT 57, -- e.g., 57 minutes for official test
  is_mock_test BOOLEAN DEFAULT FALSE, -- differentiate practice vs mock tests
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty_level ON quizzes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON quizzes(is_active);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_mock_test ON quizzes(is_mock_test);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select')) DEFAULT 'multiple_choice',
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer VARCHAR(10) NOT NULL, -- e.g., 'A', 'B', 'C', 'D' or 'A,C' for multiple select
  explanation TEXT, -- why the answer is correct - shown after submission
  image_url TEXT, -- link to question diagram/image if applicable
  image_alt_text TEXT, -- accessibility
  difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  times_answered_correctly INTEGER DEFAULT 0,
  times_answered_incorrectly INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_level ON questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_order_index ON questions(order_index);

-- Quiz Attempts (user quiz history)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  is_passed BOOLEAN DEFAULT FALSE,
  time_taken_seconds INTEGER,
  attempt_number INTEGER DEFAULT 1, -- 1st, 2nd, 3rd attempt at this quiz
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_is_passed ON quiz_attempts(is_passed);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at);

-- User Answers (individual answers per question)
CREATE TABLE IF NOT EXISTS user_answers (
  id SERIAL PRIMARY KEY,
  quiz_attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL, -- what user selected
  correct_answer TEXT NOT NULL, -- what the correct answer was
  is_correct BOOLEAN DEFAULT FALSE,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_answers_quiz_attempt_id ON user_answers(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_is_correct ON user_answers(is_correct);

-- Videos (educational content)
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_category_id ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);
CREATE INDEX IF NOT EXISTS idx_videos_order_index ON videos(order_index);

-- Bookmarks (save content for later)
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) CHECK (content_type IN ('quiz', 'article', 'video', 'question')) NOT NULL,
  content_id INTEGER NOT NULL, -- ID of the quiz, video, or article
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_type, content_id) -- Prevent duplicate bookmarks
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_content_type ON bookmarks(content_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);

-- Highway Code Articles (if you need them)
CREATE TABLE IF NOT EXISTS highway_code_articles (
  id SERIAL PRIMARY KEY,
  section_number VARCHAR(50), -- e.g., "Rule 1", "Section A"
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_highway_code_category_id ON highway_code_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_highway_code_is_active ON highway_code_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_highway_code_order_index ON highway_code_articles(order_index);
