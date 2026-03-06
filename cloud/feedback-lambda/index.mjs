import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';

const TABLE_NAME = process.env.FEEDBACK_TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json',
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (!TABLE_NAME) {
    return response(500, { ok: false, error: 'Missing FEEDBACK_TABLE_NAME' });
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    const type = String(body.type || '').trim().toLowerCase();
    const message = String(body.message || '').trim();
    const email = String(body.email || '').trim();
    const version = String(body.version || '').trim();
    const page = String(body.page || '').trim();
    const userAgent = String(body.userAgent || '').trim();

    if (!type || !message) {
      return response(400, { ok: false, error: 'type and message are required' });
    }

    const now = new Date();
    const item = {
      pk: `FEEDBACK#${now.toISOString().slice(0, 10)}`,
      sk: `${now.toISOString()}#${crypto.randomUUID()}`,
      id: crypto.randomUUID(),
      type,
      message,
      email: email || null,
      version: version || null,
      page: page || null,
      userAgent: userAgent || null,
      status: 'new',
      source: 'servicedeskhero-web',
      createdAt: now.toISOString(),
    };

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return response(200, { ok: true, id: item.id });
  } catch (error) {
    console.error('feedback submit failed', error);
    return response(500, { ok: false, error: 'feedback submit failed' });
  }
};
