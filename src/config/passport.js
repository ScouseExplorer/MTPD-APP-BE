import passport from 'passport';
import pkg from 'passport-google-oauth20';
const { Strategy: GoogleStrategy } = pkg;
import * as db from './database.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const avatar = profile.photos[0]?.value;

        // Check if user exists by Google ID
        let result = await db.query(
          'SELECT * FROM users WHERE google_id = $1',
          [googleId]
        );

        let user = result.rows[0];

        if (!user) {
          // Check if user exists by email
          result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );
          user = result.rows[0];

          if (user) {
            // Link Google account to existing user
            await db.query(
              'UPDATE users SET google_id = $1, avatar = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [googleId, avatar, user.id]
            );
          } else {
            // Create new user
            result = await db.query(
              `INSERT INTO users (email, google_id, name, avatar, is_email_verified, role)
               VALUES ($1, $2, $3, $4, true, 'user')
               RETURNING *`,
              [email, googleId, name, avatar]
            );
            user = result.rows[0];
          }
        }

        // Update last login
        await db.query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;