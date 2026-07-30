// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import crypto from 'crypto'

/**
 * Gallery passwords are shared secrets the photographer hands to clients, so they
 * must be readable back — a one-way hash would make them impossible to look up.
 * They are encrypted rather than stored in plain text so a stolen database dump
 * alone does not reveal them.
 *
 * This is deliberately NOT used for account passwords, which stay bcrypt-hashed.
 */

const ALGORITHM = 'aes-256-gcm'

function key(): Buffer {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decryptSecret(payload: string | null): string | null {
  if (!payload) return null
  const [ivPart, tagPart, dataPart] = payload.split('.')
  if (!ivPart || !tagPart || !dataPart) return null

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key(),
      Buffer.from(ivPart, 'base64url')
    )
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // Wrong SESSION_SECRET or tampered ciphertext.
    return null
  }
}

/** Timing-safe comparison for gallery password checks. */
export function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
