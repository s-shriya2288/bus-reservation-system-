import http.server
import os
import sys

# Ensure serving in the directory where server.py is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8085

class MyHandler(http.server.CGIHTTPRequestHandler):
    cgi_directories = ["/cgi-bin"]

def run():
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, MyHandler)
    print(f"Serving HTTP on 0.0.0.0 port {PORT} (http://localhost:{PORT}/) ...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nKeyboard interrupt received, exiting.")
        sys.exit(0)

if __name__ == '__main__':
    run()
