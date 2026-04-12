const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(6).max(50),
    avatar_url: z.string().url().optional().or(z.literal(''))
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(50)
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
