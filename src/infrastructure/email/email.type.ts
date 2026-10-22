import { Recipient } from "@/application/ports/driven/email-sender.port";

export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailLayoutOptions {
  title: string;
  body: string;
  preheader?: string;
  cta?: {
    label: string;
    url: string;
    variant?: "primary" | "secondary";
  };
  footerNote?: string;
  theme?: "default" | "urgent" | "success";
  includeUnsubscribe?: boolean;
}

export interface EmailTemplateContext<TData = unknown> {
  recipient: Recipient;
  data: TData;
}

export interface EmailTemplate<TData = unknown> {
  readonly templateType: string;
  generate(context: EmailTemplateContext<TData>): EmailContent;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailClient {
  sendEmail(options: SendEmailOptions): Promise<void>;
}
