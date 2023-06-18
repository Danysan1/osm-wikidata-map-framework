ALTER TABLE owmf.etymology 
ADD CONSTRAINT etymology_et_el_id_fkey 
FOREIGN KEY (et_el_id) 
REFERENCES owmf.element (el_id);
