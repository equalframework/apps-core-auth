#!/bin/bash
cp -r version ../version && cp -r web.app ../web.app && cp -r manifest.json ../manifest.json
rm -rf ../../../../../public/auth && mkdir ../../../../../public/auth && cp -a dist/symbiose/* ../../../../../public/auth/