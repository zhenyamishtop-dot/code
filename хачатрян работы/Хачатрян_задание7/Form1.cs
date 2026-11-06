using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание7
{
    public partial class Form1 : Form
    {
        String File_name = "Noname.rtf";

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            string dir = Path.GetFullPath(Path.Combine(Application.StartupPath, @"..\..\Тексты"));
            openFileDialog1.InitialDirectory = dir;
            saveFileDialog1.InitialDirectory = dir;

            statusStrip1.Items[1].Text = DateTime.Now.ToShortDateString();
            ShowFileName();
            ShowPosition();
        }

        private void ShowFileName()
        {
            statusStrip1.Items[0].Text = Path.GetFileName(File_name);
            Text = "Маленький текстовый редактор - " + Path.GetFileName(File_name);
        }

        private void ShowPosition()
        {
            int pos = richTextBox1.SelectionStart;
            int line = richTextBox1.GetLineFromCharIndex(pos);
            int col = pos - richTextBox1.GetFirstCharIndexFromLine(line);
            statusStrip1.Items[2].Text = "Строка " + (line + 1) + ", символ " + (col + 1);
        }

        private void richTextBox1_SelectionChanged(object sender, EventArgs e)
        {
            ShowPosition();
        }

        private void AskSave(string caption)
        {
            if (richTextBox1.Modified == true)
            {
                var result = MessageBox.Show("Сохранить изменения в файле " + Path.GetFileName(File_name) + "?",
                                             caption, MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (result == DialogResult.Yes)
                    сохранитьToolStripMenuItem_Click(this, EventArgs.Empty);
            }
        }

        private void создатьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Создать");
            richTextBox1.Clear();
            richTextBox1.Modified = false;
            File_name = "Noname.rtf";
            ShowFileName();
        }

        private void открытьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Открыть");
            openFileDialog1.FileName = Path.GetFileName(File_name);
            if (openFileDialog1.ShowDialog() == DialogResult.OK)
            {
                File_name = openFileDialog1.FileName;
                richTextBox1.LoadFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
                ShowFileName();
            }
        }

        private void сохранитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (File_name == "Noname.rtf")
                сохранитькакToolStripMenuItem_Click(sender, e);
            else
            {
                richTextBox1.SaveFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
            }
        }

        private void сохранитькакToolStripMenuItem_Click(object sender, EventArgs e)
        {
            saveFileDialog1.FileName = Path.GetFileName(File_name);
            if (saveFileDialog1.ShowDialog() == DialogResult.OK)
            {
                File_name = saveFileDialog1.FileName;
                richTextBox1.SaveFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
                ShowFileName();
            }
        }

        private void выходToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Close();
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            AskSave("Выход");
        }

        private void вырезатьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            DataFormats.Format myFormat = DataFormats.GetFormat(DataFormats.Rtf);
            if (richTextBox1.SelectionLength > 0)
            {
                Clipboard.SetData(myFormat.Name, richTextBox1.SelectedRtf);
                richTextBox1.SelectedText = "";
            }
        }

        private void копироватьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            DataFormats.Format myFormat = DataFormats.GetFormat(DataFormats.Rtf);
            if (richTextBox1.SelectionLength > 0)
            {
                Clipboard.SetData(myFormat.Name, richTextBox1.SelectedRtf);
            }
        }

        private void вставитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            DataFormats.Format myFormat = DataFormats.GetFormat(DataFormats.Rtf);
            if (Clipboard.ContainsData(myFormat.Name))
                richTextBox1.Paste(myFormat);
            else if (Clipboard.ContainsText())
                richTextBox1.Paste(DataFormats.GetFormat(DataFormats.Text));
        }

        private void выделитьвсеToolStripMenuItem_Click(object sender, EventArgs e)
        {
            richTextBox1.SelectAll();
        }

        private void цветТекстаToolStripMenuItem_Click(object sender, EventArgs e)
        {
            colorDialog1.Color = richTextBox1.SelectionColor;
            if (colorDialog1.ShowDialog() == DialogResult.OK)
                richTextBox1.SelectionColor = colorDialog1.Color;
        }

        private void цветФонаToolStripMenuItem_Click(object sender, EventArgs e)
        {
            colorDialog1.Color = richTextBox1.SelectionBackColor;
            if (colorDialog1.ShowDialog() == DialogResult.OK)
                richTextBox1.SelectionBackColor = colorDialog1.Color;
        }

        private void шрифтToolStripMenuItem_Click(object sender, EventArgs e)
        {
            fontDialog1.Font = richTextBox1.SelectionFont;
            if (fontDialog1.ShowDialog() == DialogResult.OK)
            {
                if (fontDialog1.Font.Equals(richTextBox1.SelectionFont) == false)
                    richTextBox1.SelectionFont = fontDialog1.Font;
            }
        }

        private void найтиToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String What = toolStripTextBox1.Text;
            if (What == "")
            {
                MessageBox.Show("Введите искомый текст в поле на панели инструментов.", "Поиск");
                return;
            }
            int count = 0;
            int ind = richTextBox1.Text.IndexOf(What, 0);
            while (ind != -1)
            {
                richTextBox1.Select(ind, What.Length);
                richTextBox1.SelectionBackColor = Color.Aqua;
                count++;
                ind = richTextBox1.Text.IndexOf(What, ind + What.Length);
            }
            richTextBox1.Select(0, 0);
            MessageBox.Show("Найдено совпадений: " + count, "Поиск");
        }

        private void диалогтекстToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Диалог_текст newForm = new Диалог_текст();
            newForm.Word = richTextBox1.SelectedText;
            if (newForm.ShowDialog() == DialogResult.OK)
                richTextBox1.SelectedText = newForm.NewWord;
        }

        private void диалогдатаToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Диалог_дата newForm = new Диалог_дата();
            if (newForm.ShowDialog() == DialogResult.OK)
                richTextBox1.SelectedText = newForm.DateText;
        }

        private int CountMarks(String s, String marks)
        {
            int count = 0;
            for (int i = 0; i < s.Length; i++)
            {
                if (marks.IndexOf(s[i]) != -1)
                    count++;
            }
            return count;
        }

        private void знакиПрепинанияToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String s = richTextBox1.Text;
            if (richTextBox1.SelectionLength > 0)
                s = richTextBox1.SelectedText;

            int all = CountMarks(s, ".?!");
            MessageBox.Show("Точек: " + CountMarks(s, ".") +
                            "\nВопросительных знаков: " + CountMarks(s, "?") +
                            "\nВосклицательных знаков: " + CountMarks(s, "!") +
                            "\n\nВсего знаков '.', '?', '!': " + all,
                            "Знаки препинания");
        }

        private void вырезатьКонтекстToolStripMenuItem_Click(object sender, EventArgs e)
        {
            вырезатьToolStripMenuItem_Click(sender, e);
        }

        private void копироватьКонтекстToolStripMenuItem_Click(object sender, EventArgs e)
        {
            копироватьToolStripMenuItem_Click(sender, e);
        }

        private void вставитьКонтекстToolStripMenuItem_Click(object sender, EventArgs e)
        {
            вставитьToolStripMenuItem_Click(sender, e);
        }

        private void выделитьвсеКонтекстToolStripMenuItem_Click(object sender, EventArgs e)
        {
            выделитьвсеToolStripMenuItem_Click(sender, e);
        }

        private void toolStrip1_ItemClicked(object sender, ToolStripItemClickedEventArgs e)
        {
            switch (toolStrip1.Items.IndexOf(e.ClickedItem))
            {
                case 0: { создатьToolStripMenuItem_Click(sender, e); break; }
                case 1: { открытьToolStripMenuItem_Click(sender, e); break; }
                case 2: { сохранитьToolStripMenuItem_Click(sender, e); break; }
                case 4: { вырезатьToolStripMenuItem_Click(sender, e); break; }
                case 5: { копироватьToolStripMenuItem_Click(sender, e); break; }
                case 6: { вставитьToolStripMenuItem_Click(sender, e); break; }
                case 8: { цветТекстаToolStripMenuItem_Click(sender, e); break; }
                case 9: { цветФонаToolStripMenuItem_Click(sender, e); break; }
                case 10: { шрифтToolStripMenuItem_Click(sender, e); break; }
                case 13: { найтиToolStripMenuItem_Click(sender, e); break; }
            }
        }
    }
}
