# How to Find Your Server Username and IP Address

Guide to find your server credentials for SSH access.

## Finding Your Server IP Address

### Option 1: From Your Hosting Provider Dashboard

**DigitalOcean:**

1. Log in to https://cloud.digitalocean.com
2. Go to "Droplets"
3. Your server IP is shown in the list
4. Click on your droplet to see details

**AWS (EC2):**

1. Log in to AWS Console
2. Go to EC2 → Instances
3. Your server IP is in the "Public IPv4 address" column

**Linode:**

1. Log in to https://cloud.linode.com
2. Go to "Linodes"
3. Your server IP is shown in the list

**Vultr:**

1. Log in to https://my.vultr.com
2. Go to "Servers"
3. Your server IP is shown in the list

**Other Providers:**

- Check your hosting provider's dashboard/control panel
- Look for "Servers", "Instances", "Droplets", or "VPS" section
- The IP address is usually displayed prominently

### Option 2: From Your Domain DNS

If your domain is already pointing to your server:

```bash
# From your local machine
dig +short spokewheel.app
# or
nslookup spokewheel.app
```

This will show your server IP.

### Option 3: From Your Server (if you have any access)

If you can access your server through a web console or other method:

```bash
# On the server
curl ifconfig.me
# or
curl ipinfo.io/ip
# or
hostname -I
```

## Finding Your Username

### Common Default Usernames by Provider:

**DigitalOcean:**

- Default: `root` (for older droplets) or `ubuntu` (for Ubuntu), `debian` (for Debian)
- Check: Droplet creation email or dashboard

**AWS EC2:**

- Ubuntu: `ubuntu`
- Amazon Linux: `ec2-user`
- Debian: `admin` or `debian`
- CentOS: `centos`
- RHEL: `ec2-user`

**Linode:**

- Default: `root` (if you didn't create a user)
- Or the username you created during setup

**Vultr:**

- Default: `root`
- Or the username you created

**Generic Linux:**

- Often: `root`, `ubuntu`, `debian`, `admin`, or a username you created

### How to Find Your Username:

1. **Check your hosting provider's documentation** - They usually tell you the default username
2. **Check your server creation email** - Many providers send this info
3. **Check your hosting dashboard** - Some show the username
4. **Try common defaults** - `root`, `ubuntu`, `admin`

## How to Connect via SSH

### Step 1: Get Your Server IP

From your hosting provider dashboard (see above).

### Step 2: Get Your Username

From your hosting provider (see above).

### Step 3: Connect via SSH

**From macOS/Linux:**

```bash
ssh username@server-ip
```

**Example:**

```bash
ssh root@178.42.255.55
# or
ssh ubuntu@178.42.255.55
```

**First time connection:**

- You'll be asked to accept the server's fingerprint (type `yes`)
- You'll be asked for a password (or use SSH key if configured)

### Step 4: If You Don't Have Password

**Option A: Use SSH Key (Recommended)**

1. Generate SSH key on your local machine (if you don't have one):

   ```bash
   ssh-keygen -t rsa -b 4096
   ```

2. Copy public key to server:

   ```bash
   ssh-copy-id username@server-ip
   ```

3. Or add your public key through hosting provider's dashboard

**Option B: Reset Password**

Most hosting providers let you reset the root password through their dashboard:

- DigitalOcean: Droplet → Access → Reset Root Password
- AWS: EC2 → Instances → Connect → Get Password
- Linode: Server → Settings → Reset Root Password

## Quick Checklist

Before connecting, you need:

- [ ] Server IP address (from hosting dashboard)
- [ ] Username (usually `root`, `ubuntu`, or `admin`)
- [ ] Password or SSH key
- [ ] SSH access enabled (usually enabled by default)

## Testing Connection

```bash
# Test if you can reach the server
ping your-server-ip

# Test SSH connection
ssh -v username@server-ip
```

The `-v` flag shows verbose output to help debug connection issues.

## Common Issues

### "Permission denied (publickey)"

**Solution:** You need to use SSH key or password authentication. Check your hosting provider's SSH setup guide.

### "Connection refused"

**Solution:**

- Check if SSH is enabled on your server
- Check firewall allows port 22
- Verify the IP address is correct

### "Host key verification failed"

**Solution:**

```bash
ssh-keygen -R server-ip
```

Then try connecting again.

## Still Can't Find It?

1. **Check your hosting provider's documentation** - They have guides for SSH access
2. **Check your email** - Server creation emails often contain this info
3. **Contact support** - Your hosting provider's support can help
4. **Check if you have web console access** - Some providers offer browser-based terminal

## What Hosting Provider Are You Using?

If you tell me your hosting provider, I can give you specific instructions:

- DigitalOcean
- AWS
- Linode
- Vultr
- Other (name it)

