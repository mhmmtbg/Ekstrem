import re
def s(path): 
    t=open(path,encoding='utf-8').read().replace('</script','<\\/script')
    return '<script>\n'+t+'\n</script>'
def app_with_plan():
    a=open('app.js',encoding='utf-8').read(); pl=open('plan.js',encoding='utf-8').read()
    mk='/* ---------- Başlat ---------- */'
    assert mk in a
    a=a.replace(mk, pl+'\n'+mk)
    return '<script>\n'+a.replace('</script','<\\/script')+'\n</script>'
h=open('src.html',encoding='utf-8').read()
h=h.replace('<!--PDFJS-->',s('node_modules/pdfjs-dist/build/pdf.min.js'))
h=h.replace('<!--PDFWORKER-->',s('node_modules/pdfjs-dist/build/pdf.worker.min.js'))
h=h.replace('<!--PARSER-->',s('parser.js')).replace('<!--CATS-->',s('cats.js')).replace('<!--GENERIC-->',s('generic.js')).replace('<!--H2I-->',s('node_modules/html-to-image/dist/html-to-image.js')).replace('<!--APP-->',app_with_plan())
import base64
def ff(fam,path,rng,weight='100 900',fmt='woff2'):
    d=base64.b64encode(open(path,'rb').read()).decode()
    return "@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%s;src:url(data:font/woff2;base64,%s) format('%s');unicode-range:%s}"%(fam,weight,d,fmt,rng)
LAT='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
EXT='U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+20A0-20C0,U+2C60-2C7F,U+A720-A7FF'
B='node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-'
M='node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-'
fonts='<style>'+''.join([ff('Bricolage Grotesque Variable',B+'latin-standard-normal.woff2',LAT,'200 800','woff2-variations'),
  ff('Bricolage Grotesque Variable',B+'latin-ext-standard-normal.woff2',EXT,'200 800','woff2-variations'),
  ff('IBM Plex Mono',M+'latin-400-normal.woff2',LAT,'400'),ff('IBM Plex Mono',M+'latin-ext-400-normal.woff2',EXT,'400'),
  ff('IBM Plex Mono',M+'latin-600-normal.woff2',LAT,'600'),ff('IBM Plex Mono',M+'latin-ext-600-normal.woff2',EXT,'600')])+'</style>'
h=h.replace('<!--FONTS-->',fonts)
import os; os.makedirs('dist',exist_ok=True)
open('dist/index.html','w',encoding='utf-8').write(h)
print(len(h)//1024,'KB')
