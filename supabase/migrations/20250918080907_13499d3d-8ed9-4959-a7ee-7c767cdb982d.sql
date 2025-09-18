-- Migrate existing jobs to separate language requirements and competencies from requirements_md

-- Create a function to extract and clean language requirements from requirements_md
CREATE OR REPLACE FUNCTION extract_language_requirements(requirements_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    lines TEXT[];
    line TEXT;
    in_language_section BOOLEAN := FALSE;
    json_content TEXT := '';
    json_obj JSONB;
    lang_key TEXT;
    lang_value TEXT;
BEGIN
    IF requirements_text IS NULL THEN
        RETURN '';
    END IF;
    
    lines := string_to_array(requirements_text, E'\n');
    
    FOR i IN 1..array_length(lines, 1) LOOP
        line := lines[i];
        
        -- Check if we're entering language requirements section
        IF line ~ '^#\s*Language Requirements' THEN
            in_language_section := TRUE;
            CONTINUE;
        END IF;
        
        -- Check if we're leaving language requirements section (next # section)
        IF in_language_section AND line ~ '^#\s*[^#]' THEN
            EXIT;
        END IF;
        
        -- Collect content if we're in language section
        IF in_language_section AND trim(line) != '' THEN
            -- Check if line looks like JSON
            IF line ~ '^\s*\{' THEN
                json_content := line;
            ELSIF json_content != '' AND line ~ '^\s*\}' THEN
                json_content := json_content || line;
                -- Try to parse JSON
                BEGIN
                    json_obj := json_content::JSONB;
                    -- Convert JSON to markdown format
                    FOR lang_key, lang_value IN SELECT * FROM jsonb_each_text(json_obj) LOOP
                        result := result || '- **' || initcap(lang_key) || '**: ' || lang_value || E'\n';
                    END LOOP;
                EXCEPTION WHEN OTHERS THEN
                    -- If JSON parsing fails, keep original text
                    result := result || json_content || E'\n';
                END;
                json_content := '';
            ELSIF json_content != '' THEN
                json_content := json_content || line;
            ELSE
                result := result || line || E'\n';
            END IF;
        END IF;
    END LOOP;
    
    RETURN trim(result);
END;
$$ LANGUAGE plpgsql;

-- Create a function to extract competencies from requirements_md
CREATE OR REPLACE FUNCTION extract_competencies(requirements_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    lines TEXT[];
    line TEXT;
    in_competencies_section BOOLEAN := FALSE;
BEGIN
    IF requirements_text IS NULL THEN
        RETURN '';
    END IF;
    
    lines := string_to_array(requirements_text, E'\n');
    
    FOR i IN 1..array_length(lines, 1) LOOP
        line := lines[i];
        
        -- Check if we're entering competencies section
        IF line ~ '^#\s*Competencies' THEN
            in_competencies_section := TRUE;
            CONTINUE;
        END IF;
        
        -- Check if we're leaving competencies section (next # section or end)
        IF in_competencies_section AND line ~ '^#\s*[^#]' THEN
            EXIT;
        END IF;
        
        -- Collect content if we're in competencies section
        IF in_competencies_section AND trim(line) != '' THEN
            result := result || line || E'\n';
        END IF;
    END LOOP;
    
    RETURN trim(result);
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean requirements_md by removing language and competencies sections
CREATE OR REPLACE FUNCTION clean_requirements_md(requirements_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    lines TEXT[];
    line TEXT;
    in_language_section BOOLEAN := FALSE;
    in_competencies_section BOOLEAN := FALSE;
BEGIN
    IF requirements_text IS NULL THEN
        RETURN '';
    END IF;
    
    lines := string_to_array(requirements_text, E'\n');
    
    FOR i IN 1..array_length(lines, 1) LOOP
        line := lines[i];
        
        -- Check if we're entering language requirements section
        IF line ~ '^#\s*Language Requirements' THEN
            in_language_section := TRUE;
            CONTINUE;
        END IF;
        
        -- Check if we're entering competencies section
        IF line ~ '^#\s*Competencies' THEN
            in_competencies_section := TRUE;
            CONTINUE;
        END IF;
        
        -- Check if we're leaving current section (next # section)
        IF (in_language_section OR in_competencies_section) AND line ~ '^#\s*[^#]' THEN
            in_language_section := FALSE;
            in_competencies_section := FALSE;
            -- Include this line as it's a new section
            result := result || line || E'\n';
            CONTINUE;
        END IF;
        
        -- Include content if we're not in language or competencies sections
        IF NOT in_language_section AND NOT in_competencies_section THEN
            result := result || line || E'\n';
        END IF;
    END LOOP;
    
    RETURN trim(result);
END;
$$ LANGUAGE plpgsql;

-- Update all jobs that have language requirements or competencies sections in requirements_md
UPDATE jobs 
SET 
    language_requirements = COALESCE(NULLIF(extract_language_requirements(requirements_md), ''), language_requirements),
    competencies = COALESCE(NULLIF(extract_competencies(requirements_md), ''), competencies),
    requirements_md = clean_requirements_md(requirements_md)
WHERE 
    requirements_md IS NOT NULL 
    AND (
        requirements_md ~ '#\s*Language Requirements' 
        OR requirements_md ~ '#\s*Competencies'
    );

-- Clean up the temporary functions
DROP FUNCTION IF EXISTS extract_language_requirements(TEXT);
DROP FUNCTION IF EXISTS extract_competencies(TEXT);
DROP FUNCTION IF EXISTS clean_requirements_md(TEXT);