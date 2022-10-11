ALTER TABLE oem.etymology 
ADD CONSTRAINT etymology_et_el_id_fkey 
FOREIGN KEY (et_el_id) 
REFERENCES oem.element (el_id);
