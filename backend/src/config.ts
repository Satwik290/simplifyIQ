import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  GEMINI_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['nodemailer', 'sendgrid']).default('nodemailer'),
  EMAIL_FROM: z.string().email().default('noreply@simplif-iq.com'),
  EMAIL_FROM_NAME: z.string().default('SimplifIQ Audits'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional()
});

let config: z.infer<typeof configSchema>;

try {
  config = configSchema.parse(process.env);
  
  // Validate required combinations
  if (config.EMAIL_PROVIDER === 'nodemailer' && !config.SMTP_HOST) {
    throw new Error('SMTP_HOST required when EMAIL_PROVIDER=nodemailer');
  }
} catch (error) {
  console.error('❌ Configuration validation failed:');
  if (error instanceof z.ZodError) {
    error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
  } else {
    console.error(`   - ${error}`);
  }
  process.exit(1);
}

export { config };
