IDLC=/usr/lib/firefox/xpidl
INC=/usr/share/idl/mozilla/
XPTS=ItasaNotifier.xpt
IDLS=ItasaNotifier.idl

all:
	 $(IDLC) -m typelib -w -v -I $(INC) -e $(XPTS) $(IDLS)

.PHONY: all
