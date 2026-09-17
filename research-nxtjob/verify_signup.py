#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import sys

def verify_code(code, sua_id="sua_3JEdtCYjVmfK0ceab7c2O5bRYFR"):
    headers = {
        'Authorization': 'pk_live_Y2xlcmsubnh0am9iLmFpJA',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    }

    url = f'https://clerk.nxtjob.ai/v1/client/sign_ups/{sua_id}/attempt_verification'
    data = urllib.parse.urlencode({
        'strategy': 'email_code',
        'code': code.strip()
    }).encode()

    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        res = urllib.request.urlopen(req)
        client_jwt = res.headers.get('Authorization')
        body = json.loads(res.read().decode())
        print("Verification Successful!")
        print("Session ID:", body.get('response', {}).get('created_session_id'))
        print("User ID:", body.get('response', {}).get('created_user_id'))
        with open('session_auth.json', 'w') as f:
            json.dump({'client_jwt': client_jwt, 'body': body}, f, indent=2)
        return body
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"Error {e.code}: {err}")
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        verify_code(sys.argv[1])
    else:
        print("Usage: python3 verify_signup.py <6-digit-code>")
