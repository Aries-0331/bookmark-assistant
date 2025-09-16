# JWT Secret Generation and Management Guide

## 🔐 **JWT Secret: Complete Guide**

### **What is a JWT Secret?**

A JWT (JSON Web Token) secret is a cryptographic key used to:

- **Sign tokens** when creating them
- **Verify tokens** when validating them
- **Ensure token integrity** and prevent tampering

### **Security Requirements**

✅ **Minimum 256 bits (32 bytes)**
✅ **Cryptographically random**
✅ **Different for each environment**
✅ **Never committed to Git**
✅ **Regularly rotated**

---

## **Method 1: Generate with OpenSSL (Recommended)**

### **🔧 Generate Base64 Encoded Secret**

```bash
# Generate a 256-bit (32-byte) random secret
openssl rand -base64 32

# Example output:
# K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

### **🔧 Generate Hex Encoded Secret**

```bash
# Generate a 256-bit hex secret
openssl rand -hex 32

# Example output:
# 2bb80d537b0da3e38bd30361aa8556863de0eacd7162fef6a25fe97bf527628b
```

### **🔧 Generate Different Length Secrets**

```bash
# 128-bit (not recommended for production)
openssl rand -base64 16

# 512-bit (extra secure)
openssl rand -base64 64
```

---

## **Method 2: Generate with Node.js**

### **🔧 Using crypto module**

```bash
# Run this command to generate a secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or hex format
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **🔧 Create a Generator Script**

Create `scripts/generate-jwt-secret.js`:

```javascript
const crypto = require('crypto');

function generateJWTSecret(length = 32, encoding = 'base64') {
  const secret = crypto.randomBytes(length).toString(encoding);
  console.log(`Generated JWT Secret (${length * 8}-bit, ${encoding}):`);
  console.log(secret);
  console.log(`Length: ${secret.length} characters`);
  return secret;
}

// Generate different formats
console.log('='.repeat(50));
generateJWTSecret(32, 'base64'); // Recommended
console.log('='.repeat(50));
generateJWTSecret(32, 'hex');
console.log('='.repeat(50));
generateJWTSecret(64, 'base64'); // Extra secure
```

Run it:

```bash
node scripts/generate-jwt-secret.js
```

---

## **Method 3: Online Generators (Use Carefully)**

### **🔧 Trusted Online Tools**

Only use these for development (not production):

1. **1Password Secret Generator**: https://1password.com/password-generator/
2. **LastPass Generator**: Built into LastPass
3. **Random.org**: https://www.random.org/strings/

### **⚠️ Security Warning**

- Never use online generators for production secrets
- Always generate secrets on your local machine for production

---

## **Environment-Specific Secret Management**

### **🏠 Development Environment**

**For Local Development:**

```bash
# Generate development secret
openssl rand -base64 32

# Add to packages/server/.env
JWT_SECRET=your_dev_secret_here
```

### **🚀 Production Environment (Vercel)**

**Generate Production Secret:**

```bash
# Generate a different secret for production
openssl rand -base64 32

# Add to Vercel via CLI
cd packages/server
vercel env add JWT_SECRET production

# Or via Vercel Dashboard
# Settings → Environment Variables → Add
```

### **🧪 Preview/Staging Environment**

```bash
# Generate preview secret
openssl rand -base64 32

# Add to Vercel preview environment
vercel env add JWT_SECRET preview
```

---

## **Best Practices for JWT Secret Management**

### **✅ DO**

1. **Use different secrets** for each environment
2. **Store in environment variables** only
3. **Rotate regularly** (every 3-6 months)
4. **Use minimum 256 bits** for production
5. **Keep secrets in secure password manager**
6. **Use base64 encoding** for compatibility

### **❌ DON'T**

1. **Never commit** secrets to Git
2. **Don't reuse** secrets across projects
3. **Don't share** secrets in plain text
4. **Don't use weak** or predictable secrets
5. **Don't store** in client-side code

---

## **Quick Setup for Your Project**

### **🔧 Step 1: Generate Secrets**

```bash
# Development secret
echo "Development JWT Secret:"
openssl rand -base64 32

# Production secret
echo "Production JWT Secret:"
openssl rand -base64 32
```

### **🔧 Step 2: Set Development Secret**

```bash
cd packages/server
cp .env.example .env

# Edit .env and add:
# JWT_SECRET=your_dev_secret_from_step1
```

### **🔧 Step 3: Set Production Secret**

**Option A: Vercel CLI**

```bash
vercel env add JWT_SECRET production
# Paste your production secret when prompted
```

**Option B: Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select `bookmark-notion-sync-server`
3. Settings → Environment Variables
4. Add `JWT_SECRET` with your production secret

### **🔧 Step 4: Test Secrets**

```bash
# Test development
cd packages/server
npm run dev

# Test production after deployment
curl https://bookmark-notion-sync-server.vercel.app/health
```

---

## **Secret Rotation Strategy**

### **🔄 When to Rotate**

- **Every 3-6 months** (scheduled)
- **Immediately** if compromised
- **Before major releases**
- **When team members leave**

### **🔄 How to Rotate**

1. **Generate new secret**
2. **Update environment variables**
3. **Deploy new version**
4. **Invalidate old tokens** (optional)
5. **Update documentation**

### **🔄 Rotation Script**

Create `scripts/rotate-jwt-secret.sh`:

```bash
#!/bin/bash
echo "🔄 JWT Secret Rotation"
echo "======================"

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo "New secret generated: ${NEW_SECRET:0:10}..."

# Update Vercel production
echo "Updating Vercel production..."
cd packages/server
vercel env rm JWT_SECRET production --yes
vercel env add JWT_SECRET production

# Trigger redeployment
echo "Triggering redeployment..."
vercel --prod

echo "✅ JWT secret rotation complete!"
```

---

## **Troubleshooting JWT Issues**

### **❌ Invalid Signature Errors**

```
Possible causes:
- Wrong JWT_SECRET in environment
- Secret mismatch between environments
- Secret contains special characters
```

**Solution:**

```bash
# Regenerate and verify secret
openssl rand -base64 32

# Check environment variables
vercel env ls
```

### **❌ Token Verification Failed**

```
Possible causes:
- Secret not set in environment
- Using different secrets for sign/verify
- Secret contains line breaks
```

**Solution:**

```bash
# Verify secret is set correctly
echo $JWT_SECRET

# Check for hidden characters
cat -A .env | grep JWT_SECRET
```

### **❌ Deployment Errors**

```
Possible causes:
- Environment variable not deployed
- Case-sensitive variable names
- Missing quotes in complex secrets
```

**Solution:**

```bash
# Redeploy with environment variables
vercel --prod

# Check deployment logs
vercel logs
```

---

## **Security Checklist**

Before going to production:

- [ ] Generated with cryptographically secure method
- [ ] Minimum 256 bits (32 bytes)
- [ ] Different for dev/prod environments
- [ ] Not committed to Git repository
- [ ] Stored in secure environment variables
- [ ] No special characters causing issues
- [ ] Tested token generation/verification
- [ ] Documented rotation schedule
- [ ] Team knows security procedures

---

## **For Your Current Setup**

Run these commands to set up JWT secrets for your bookmark sync project:

```bash
# 1. Generate development secret
echo "Dev Secret:" && openssl rand -base64 32

# 2. Generate production secret
echo "Prod Secret:" && openssl rand -base64 32

# 3. Set development secret
cd packages/server
# Edit .env and add the dev secret

# 4. Set production secret in Vercel
vercel env add JWT_SECRET production
# Paste the prod secret when prompted

# 5. Deploy with new secret
vercel --prod
```

**Your JWT secrets are now properly configured! 🔐**
